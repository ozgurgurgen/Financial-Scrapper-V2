export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitMetrics {
  endpoint: string;
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastError?: string;
  averageLatencyMs: number;
  stateChangeTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private lastError?: string;
  private stateChangeTime: number = Date.now();
  private latencySamples: number[] = [];

  constructor(
    public readonly endpoint: string,
    private readonly failureThreshold: number = 2,
    private readonly resetTimeoutMs: number = 20000,
    private readonly halfOpenSuccessThreshold: number = 1
  ) {}

  public canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.stateChangeTime >= this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
        return true;
      }
      return false; // Circuit is OPEN (tripped / quarantined)
    }

    if (this.state === 'HALF_OPEN') {
      return true;
    }

    return true;
  }

  public recordSuccess(latencyMs: number): void {
    this.totalRequests++;
    this.lastSuccessTime = Date.now();
    this.recordLatency(latencyMs);

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Gradually decay failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  public recordFailure(errorMsg: string, latencyMs?: number): void {
    this.totalRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.lastError = errorMsg;
    if (latencyMs) this.recordLatency(latencyMs);

    if (this.state === 'CLOSED') {
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }
    } else if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    }
  }

  public trip(): void {
    this.transitionTo('OPEN');
  }

  public reset(): void {
    this.transitionTo('CLOSED');
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stateChangeTime = Date.now();
      if (newState === 'CLOSED') {
        this.failureCount = 0;
        this.successCount = 0;
      } else if (newState === 'HALF_OPEN') {
        this.successCount = 0;
      } else if (newState === 'OPEN') {
        // Asynchronously notify Telegram
        try {
          import('./TelegramService.ts').then(({ telegramService }) => {
            telegramService.sendAlert({
              title: `Devre Kesici Karantinaya Aldı (${this.endpoint})`,
              type: 'CIRCUIT_BREAKER',
              details: `Uç nokta ardışık hatalar nedeniyle karantinaya alındı. Sistem otomatik olarak alternatif aynaya veya yedek hatta yönlendirildi.\nSon Hata: ${this.lastError || 'Bilinmiyor'}`,
              url: this.endpoint,
              payload: {
                previousState: oldState,
                failureCount: this.failureCount,
                averageLatencyMs: this.getMetrics().averageLatencyMs,
              },
            }).catch(() => {});
          }).catch(() => {});
        } catch (e) {}
      }
    }
  }

  private recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > 20) {
      this.latencySamples.shift();
    }
  }

  public getMetrics(): CircuitMetrics {
    const avgLatency = this.latencySamples.length > 0
      ? Math.round(this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length)
      : 0;

    return {
      endpoint: this.endpoint,
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      lastError: this.lastError,
      averageLatencyMs: avgLatency,
      stateChangeTime: this.stateChangeTime,
    };
  }
}

export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers = new Map<string, CircuitBreaker>();

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  public getBreaker(endpoint: string, failureThreshold = 2, resetTimeoutMs = 20000): CircuitBreaker {
    if (!this.breakers.has(endpoint)) {
      this.breakers.set(endpoint, new CircuitBreaker(endpoint, failureThreshold, resetTimeoutMs));
    }
    return this.breakers.get(endpoint)!;
  }

  public getAllMetrics(): CircuitMetrics[] {
    return Array.from(this.breakers.values()).map(b => b.getMetrics());
  }

  public resetAll(): void {
    this.breakers.forEach(b => b.reset());
  }
}

export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance();
