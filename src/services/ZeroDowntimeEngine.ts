import { circuitBreakerRegistry, CircuitBreaker } from './CircuitBreaker.ts';
import { proxyChainService } from './ProxyChainService.ts';
import { offlineRingBuffer, RingBufferSnapshot } from './OfflineRingBuffer.ts';
import { selfHealingSchemaParser } from './SelfHealingSchemaParser.ts';

export interface StreamCandidate<T = any> {
  id: string;
  name: string;
  url: string;
  fetcher: () => Promise<T>;
  weight?: number; // Preference weight 1-10
}

export interface StreamRaceResult<T = any> {
  data: T;
  winningSource: {
    id: string;
    name: string;
    url: string;
    latencyMs: number;
  };
  consensusCount: number;
  isCachedFallback: boolean;
  healingUsed?: boolean;
  circuitBreakerTripped?: boolean;
}

export interface DeduplicationOptions<T> {
  keyExtractor: (item: T) => string;
  tieBreaker?: (a: T, b: T) => T;
}

export class ZeroDowntimeEngine {
  private static instance: ZeroDowntimeEngine;
  private activeActiveEnabled: boolean = true;
  private deduplicationStats = { totalProcessed: 0, duplicatesRemoved: 0 };

  public static getInstance(): ZeroDowntimeEngine {
    if (!ZeroDowntimeEngine.instance) {
      ZeroDowntimeEngine.instance = new ZeroDowntimeEngine();
    }
    return ZeroDowntimeEngine.instance;
  }

  public isActiveActiveEnabled(): boolean {
    return this.activeActiveEnabled;
  }

  public setActiveActiveEnabled(enabled: boolean): void {
    this.activeActiveEnabled = enabled;
  }

  /**
   * Executes an Active-Active Race across multiple candidate streams.
   * Immediately resolves with the fastest valid response while continuing
   * background validation and caching the result into the Offline Ring-Buffer.
   */
  public async raceStreams<T>(
    category: string,
    candidates: StreamCandidate<T>[],
    timeoutMs: number = 6000
  ): Promise<StreamRaceResult<T>> {
    if (!candidates || candidates.length === 0) {
      // Emergency: Retrieve from Ring-Buffer
      const cached = offlineRingBuffer.getLatestSnapshot<T>(category);
      if (cached) {
        return {
          data: cached.data,
          winningSource: { id: 'ring_buffer', name: 'Yerel Ring-Buffer Önbellek', url: 'local://cache', latencyMs: 0 },
          consensusCount: 1,
          isCachedFallback: true,
        };
      }
      throw new Error(`[ZeroDowntimeEngine] ${category} için hiçbir aday kaynak ve önbellek bulunamadı.`);
    }

    // Filter candidates through Circuit Breakers
    const availableCandidates = candidates.filter((cand) => {
      const breaker = circuitBreakerRegistry.getBreaker(cand.url);
      return breaker.canExecute();
    });

    const activeList = availableCandidates.length > 0 ? availableCandidates : candidates;

    return new Promise<StreamRaceResult<T>>((resolve, reject) => {
      let resolved = false;
      const errors: Array<{ id: string; error: string }> = [];
      let consensusCounter = 0;

      // Launch all stream candidates simultaneously (Active-Active)
      activeList.forEach((cand) => {
        const start = Date.now();
        const breaker = circuitBreakerRegistry.getBreaker(cand.url);

        cand
          .fetcher()
          .then((data) => {
            const latency = Date.now() - start;
            breaker.recordSuccess(latency);
            consensusCounter++;

            if (!resolved && data) {
              resolved = true;
              // Save into Ring Buffer immediately
              offlineRingBuffer.saveSnapshot(category, data, cand.name);

              resolve({
                data,
                winningSource: {
                  id: cand.id,
                  name: cand.name,
                  url: cand.url,
                  latencyMs: latency,
                },
                consensusCount: consensusCounter,
                isCachedFallback: false,
              });
            }
          })
          .catch((err) => {
            const latency = Date.now() - start;
            breaker.recordFailure(err?.message || 'Bilinmeyen Hata', latency);
            errors.push({ id: cand.id, error: err?.message || 'Hata' });

            if (!resolved && errors.length === activeList.length) {
              // All active network candidates failed. Fallback to Offline Ring-Buffer!
              const cached = offlineRingBuffer.getLatestSnapshot<T>(category);
              if (cached) {
                resolved = true;
                resolve({
                  data: cached.data,
                  winningSource: {
                    id: 'ring_buffer_emergency',
                    name: `Acil Durum Önbellek (${cached.source})`,
                    url: 'local://ring-buffer',
                    latencyMs: 1,
                  },
                  consensusCount: 1,
                  isCachedFallback: true,
                  circuitBreakerTripped: true,
                });
              } else {
                reject(
                  new Error(
                    `[ZeroDowntimeEngine] Tüm ${activeList.length} akış başarısız oldu:\n` +
                      errors.map((e) => `• ${e.id}: ${e.error}`).join('\n')
                  )
                );
              }
            }
          });
      });

      // Overall Timeout Guard
      setTimeout(() => {
        if (!resolved) {
          const cached = offlineRingBuffer.getLatestSnapshot<T>(category);
          if (cached) {
            resolved = true;
            resolve({
              data: cached.data,
              winningSource: {
                id: 'ring_buffer_timeout_fallback',
                name: 'Zaman Aşımı Sonrası Ring-Buffer',
                url: 'local://timeout-fallback',
                latencyMs: timeoutMs,
              },
              consensusCount: 1,
              isCachedFallback: true,
            });
          } else {
            reject(new Error(`[ZeroDowntimeEngine] ${category} için ${timeoutMs}ms zaman aşımı aşıldı.`));
          }
        }
      }, timeoutMs);
    });
  }

  /**
   * Deduplicates array of records by keyExtractor
   */
  public deduplicate<T>(items: T[], options: DeduplicationOptions<T>): T[] {
    const map = new Map<string, T>();
    let dupes = 0;

    for (const item of items) {
      const key = options.keyExtractor(item);
      if (map.has(key)) {
        dupes++;
        if (options.tieBreaker) {
          map.set(key, options.tieBreaker(map.get(key)!, item));
        }
      } else {
        map.set(key, item);
      }
    }

    this.deduplicationStats.totalProcessed += items.length;
    this.deduplicationStats.duplicatesRemoved += dupes;

    return Array.from(map.values());
  }

  public getDeduplicationStats() {
    return {
      ...this.deduplicationStats,
      ratePercent:
        this.deduplicationStats.totalProcessed > 0
          ? ((this.deduplicationStats.duplicatesRemoved / this.deduplicationStats.totalProcessed) * 100).toFixed(1)
          : '0.0',
    };
  }
}

export const zeroDowntimeEngine = ZeroDowntimeEngine.getInstance();
