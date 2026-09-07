import { EventEmitter } from 'events';

export type DepartmentType = 'BORSA' | 'KAP' | 'MERKEZ_BANKASI' | 'ARSIV' | 'BACKFILL' | 'KRIPTO' | 'HALKA_ARZ' | 'HABERLER' | 'AMERIKA' | 'ETF_FONLARI';
export type ActorType = 
  | 'YAHOO_ADAPTER' 
  | 'MARKET_SERVICE' 
  | 'TEFAS_ADAPTER' 
  | 'TCMB_ADAPTER' 
  | 'FRED_ADAPTER' 
  | 'KAP_ADAPTER' 
  | 'KAP_SCRAPER' 
  | 'TEFAS_HOLDINGS' 
  | 'SCHEDULER' 
  | 'SYNC_MANAGER' 
  | 'AI_SERVICE' 
  | 'BACKFILL_SERVICE'
  | 'CRYPTO_ADAPTER'
  | 'IPO_SERVICE'
  | 'NEWS_SERVICE'
  | 'ANALYST_SERVICE'
  | 'WALL_STREET_ADAPTER'
  | 'ETF_ADAPTER'
  | 'SYSTEM';

export type EventStatus = 'IDLE' | 'BUSY' | 'SUCCESS' | 'ERROR' | 'COOLDOWN';

export interface OfficeSimEvent {
  id: string;
  type: string;
  actor: ActorType;
  department: DepartmentType;
  status: EventStatus;
  detail: string;
  payload?: Record<string, any>;
  timestamp: string;
}

class AppEventBusImpl extends EventEmitter {
  private recentEvents: OfficeSimEvent[] = [];
  private readonly maxRecentEvents = 50;

  constructor() {
    super();
    // Increase limit for concurrent SSE clients if needed
    this.setMaxListeners(100);
  }

  /**
   * Safe emit method that formats and pushes the event to memory buffer and listeners
   */
  public emitOfficeEvent(event: Omit<OfficeSimEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): OfficeSimEvent {
    try {
      const formattedEvent: OfficeSimEvent = {
        id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: event.type,
        actor: event.actor,
        department: event.department,
        status: event.status,
        detail: event.detail,
        payload: event.payload || {},
        timestamp: event.timestamp || new Date().toISOString()
      };

      // Store in circular buffer for initial connection state (strictly capped at 50)
      this.recentEvents.unshift(formattedEvent);
      if (this.recentEvents.length > this.maxRecentEvents) {
        this.recentEvents.length = this.maxRecentEvents;
      }

      // If status is ERROR, notify Telegram service
      if (formattedEvent.status === 'ERROR') {
        try {
          import('./TelegramService.ts').then(({ telegramService }) => {
            telegramService.sendAlert({
              title: `[${formattedEvent.department}] ${formattedEvent.type || 'Sistem Hatası'}`,
              type: 'ERROR',
              details: `${formattedEvent.actor}: ${formattedEvent.detail}`,
              source: formattedEvent.actor,
              payload: formattedEvent.payload,
            }).catch(() => {});
          }).catch(() => {});
        } catch (e) {}
      }

      // If no listeners exist, setImmediate overhead is negligible and no serialize occurs
      setImmediate(() => {
        try {
          this.emit('office_event', formattedEvent);
        } catch (listenerErr) {
          console.warn('[AppEventBus] Listener execution error (caught safely):', listenerErr);
        }
      });

      return formattedEvent;
    } catch (outerErr) {
      console.warn('[AppEventBus] Error in emitOfficeEvent (safe fallback):', outerErr);
      return {
        id: `evt_err_${Date.now()}`,
        type: event.type || 'SYSTEM_EVENT',
        actor: event.actor || 'SYSTEM',
        department: event.department || 'ARSIV',
        status: event.status || 'ERROR',
        detail: event.detail || '',
        payload: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get the recent event buffer for new SSE connections
   */
  public getRecentEvents(): OfficeSimEvent[] {
    return [...this.recentEvents];
  }
}

// Global Singleton
export const appEventBus = new AppEventBusImpl();
