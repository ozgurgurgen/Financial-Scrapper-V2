export interface RingBufferSnapshot<T = any> {
  id: string;
  category: string;
  timestamp: string;
  recordCount: number;
  data: T;
  source: string;
}

export class OfflineRingBuffer {
  private static instance: OfflineRingBuffer;
  private serverMemoryRing = new Map<string, RingBufferSnapshot[]>();
  private readonly MAX_PER_CATEGORY = 30;

  public static getInstance(): OfflineRingBuffer {
    if (!OfflineRingBuffer.instance) {
      OfflineRingBuffer.instance = new OfflineRingBuffer();
    }
    return OfflineRingBuffer.instance;
  }

  /**
   * Saves a snapshot into the circular ring buffer (Server Memory + Client Storage Sync)
   */
  public saveSnapshot<T>(category: string, data: T, source: string = 'System'): RingBufferSnapshot<T> {
    const list = this.serverMemoryRing.get(category) || [];
    const count = Array.isArray(data) ? data.length : 1;

    const snapshot: RingBufferSnapshot<T> = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      timestamp: new Date().toISOString(),
      recordCount: count,
      data,
      source,
    };

    // Prepend and enforce max capacity (Circular Buffer)
    list.unshift(snapshot);
    if (list.length > this.MAX_PER_CATEGORY) {
      list.pop();
    }
    this.serverMemoryRing.set(category, list);

    return snapshot;
  }

  /**
   * Retrieves the most recent snapshot for a given category
   */
  public getLatestSnapshot<T>(category: string): RingBufferSnapshot<T> | null {
    const list = this.serverMemoryRing.get(category);
    if (list && list.length > 0) {
      return list[0] as RingBufferSnapshot<T>;
    }
    return null;
  }

  /**
   * Retrieves full history in ring buffer for category
   */
  public getHistory(category: string): RingBufferSnapshot[] {
    return this.serverMemoryRing.get(category) || [];
  }

  /**
   * Retrieves statistics about all stored categories in the buffer
   */
  public getBufferStats(): Array<{ category: string; count: number; lastSaved: string; latestRecordCount: number }> {
    const stats: Array<{ category: string; count: number; lastSaved: string; latestRecordCount: number }> = [];
    this.serverMemoryRing.forEach((list, cat) => {
      if (list.length > 0) {
        stats.push({
          category: cat,
          count: list.length,
          lastSaved: list[0].timestamp,
          latestRecordCount: list[0].recordCount,
        });
      }
    });
    return stats;
  }
}

export const offlineRingBuffer = OfflineRingBuffer.getInstance();
