/**
 * Client-Side Persistent Offline Storage (IndexedDB + LocalStorage Ring Buffer)
 */

const DB_NAME = 'ZeroDowntimeOfflineStore';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

class OfflineClientStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'category' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async saveSnapshot(category: string, data: any): Promise<void> {
    try {
      const db = await this.openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        category,
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        data,
      };

      store.put(record);

      // Fallback in localStorage for high-speed small datasets
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`offline_snap_${category}`, JSON.stringify(record));
        }
      } catch (e) {
        // ignore localStorage quota limit
      }
    } catch (e) {
      console.warn('[OfflineClientStorage] IndexedDB save failed:', e);
    }
  }

  public async getLatestSnapshot<T = any>(category: string): Promise<{ data: T; timestamp: string; isOfflineCache: boolean } | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(category);

        req.onsuccess = () => {
          if (req.result) {
            resolve({
              data: req.result.data,
              timestamp: req.result.timestamp,
              isOfflineCache: true,
            });
          } else {
            resolve(this.getFromLocalStorageFallback(category));
          }
        };

        req.onerror = () => {
          resolve(this.getFromLocalStorageFallback(category));
        };
      });
    } catch (e) {
      return this.getFromLocalStorageFallback(category);
    }
  }

  private getFromLocalStorageFallback(category: string) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = localStorage.getItem(`offline_snap_${category}`);
        if (item) {
          const parsed = JSON.parse(item);
          return {
            data: parsed.data,
            timestamp: parsed.timestamp,
            isOfflineCache: true,
          };
        }
      } catch (e) {}
    }
    return null;
  }

  public getNetworkStatus() {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }
}

export const offlineClientStorage = new OfflineClientStorage();
