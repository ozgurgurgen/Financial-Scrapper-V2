import axios from 'axios';
import { circuitBreakerRegistry } from './CircuitBreaker.ts';

export interface ProxyTier {
  id: string;
  tierLevel: number;
  name: string;
  type: 'DIRECT' | 'INTERNAL_PROXY' | 'EDGE_MIRROR';
  transformUrl: (targetUrl: string) => string;
  headers?: Record<string, string>;
  active: boolean;
}

export class ProxyChainService {
  private static instance: ProxyChainService;

  private tiers: ProxyTier[] = [
    {
      id: 'tier_1_direct',
      tierLevel: 1,
      name: 'Doğrudan Bağlantı (Direct Origin)',
      type: 'DIRECT',
      transformUrl: (url) => url,
      active: true,
    },
    {
      id: 'tier_2_internal',
      tierLevel: 2,
      name: 'Lokal Backend Proxy (CORS/Header Bypass)',
      type: 'INTERNAL_PROXY',
      transformUrl: (url) => url,
      active: true,
    },
    {
      id: 'tier_3_edge_mirror_1',
      tierLevel: 3,
      name: 'Global Edge Worker (AllOrigins Mirror)',
      type: 'EDGE_MIRROR',
      transformUrl: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      active: true,
    },
    {
      id: 'tier_3_edge_mirror_2',
      tierLevel: 3,
      name: 'Global Edge Proxy (CorsProxy.io)',
      type: 'EDGE_MIRROR',
      transformUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      active: true,
    },
  ];

  public static getInstance(): ProxyChainService {
    if (!ProxyChainService.instance) {
      ProxyChainService.instance = new ProxyChainService();
    }
    return ProxyChainService.instance;
  }

  public getTiers(): ProxyTier[] {
    return this.tiers;
  }

  public setTierActive(tierId: string, active: boolean): void {
    const tier = this.tiers.find((t) => t.id === tierId);
    if (tier) {
      tier.active = active;
    }
  }

  /**
   * Tries each tier sequentially with circuit breaker protection
   */
  public async fetchWithFallbackChain(
    targetUrl: string,
    options: {
      method?: 'GET' | 'POST';
      data?: any;
      timeoutMs?: number;
      customHeaders?: Record<string, string>;
    } = {}
  ): Promise<{ data: any; usedTier: ProxyTier; responseTimeMs: number }> {
    const method = options.method || 'GET';
    const timeoutMs = options.timeoutMs || 8000;
    const defaultHeaders = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, text/html, application/xml, */*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      ...(options.customHeaders || {}),
    };

    const errors: string[] = [];

    for (const tier of this.tiers) {
      if (!tier.active) continue;

      const endpointUrl = tier.transformUrl(targetUrl);
      const breaker = circuitBreakerRegistry.getBreaker(endpointUrl);

      if (!breaker.canExecute()) {
        errors.push(`[${tier.name}] Devre Kesici AÇIK (Tripped) - Atlandı`);
        continue;
      }

      const start = Date.now();
      try {
        const response = await axios({
          url: endpointUrl,
          method,
          data: options.data,
          headers: defaultHeaders,
          timeout: timeoutMs,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        const elapsed = Date.now() - start;
        breaker.recordSuccess(elapsed);

        return {
          data: response.data,
          usedTier: tier,
          responseTimeMs: elapsed,
        };
      } catch (err: any) {
        const elapsed = Date.now() - start;
        const msg = err?.response ? `HTTP ${err.response.status}` : err?.message || 'Bilinmeyen hata';
        breaker.recordFailure(msg, elapsed);
        errors.push(`[${tier.name}] Hata: ${msg}`);
      }
    }

    throw new Error(
      `Tüm kademeli proxy hatları başarısız oldu:\n${errors.join('\n')}`
    );
  }
}

export const proxyChainService = ProxyChainService.getInstance();
