import type { DataSourceAdapter, SyncResult } from './DataSourceAdapter.ts';
import { syncManager } from './SyncManager.ts';
import { db } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const FRED_SERIES = [
  // ABD (Global)
  { code: 'FEDFUNDS', name: 'US Fed Funds Rate (ABD Faizi)' },
  { code: 'UNRATE', name: 'US Unemployment Rate (ABD İşsizlik)' },
  { code: 'CPIAUCSL', name: 'US Consumer Price Index (ABD TÜFE)' },
  
  // Avrupa
  { code: 'ECBDFR', name: 'ECB Deposit Facility Rate (Avrupa Merkez Bankası Faizi)' },
  { code: 'LRHUTTTTEZM156S', name: 'Euro Area Unemployment Rate (Avrupa İşsizlik)' },
  { code: 'CP0000EZ19M086NEST', name: 'Euro Area HICP (Avrupa Enflasyon Endeksi)' }
];

export class FREDAdapter implements DataSourceAdapter {
  sourceName = 'FRED';

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    let recordsProcessed = 0;
    
    try {
      let fredKey = process.env.FRED_API_KEY;
      
      const keySetting = await db.select().from(settings).where(eq(settings.key, 'fred_api_key')).limit(1);
      if (keySetting.length > 0 && (keySetting[0].value as any)?.key) {
        fredKey = (keySetting[0].value as any).key;
      }

      if (!fredKey) {
        throw new Error('FRED API Key is missing');
      }

      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);
      const startDateStr = startDate.toISOString().split('T')[0];

      for (const s of FRED_SERIES) {
        const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.code}&api_key=${fredKey}&file_type=json&observation_start=${startDateStr}&sort_order=desc`;
        
        let response: Response | null = null;
        let lastStatus: number | string = 'Bilinmiyor';

        // Geçici 5xx veya ağ dalgalanmalarına karşı 2 defa yeniden deneme mekanizması
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            response = await fetch(fredUrl, {
              headers: {
                'User-Agent': 'BIST-Finance-Dashboard/1.0 (Node.js; FRED Sync)',
                'Accept': 'application/json'
              }
            });
            lastStatus = response.status;
            if (response.ok) {
              break;
            }
            // 500, 502, 503, 504 veya 429 durumlarında kısa bir bekleme ile tekrar dene
            if ((response.status >= 500 || response.status === 429) && attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
            } else {
              break;
            }
          } catch (fetchErr: any) {
            lastStatus = fetchErr?.message || 'NetworkError';
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
            }
          }
        }
        
        if (!response || !response.ok) {
           console.warn(`[FREDAdapter] FRED API servisi ${s.code} için geçici olarak yanıt vermedi (${lastStatus}). Mevcut veriler korunuyor.`);
           continue;
        }
        
        try {
          const data = await response.json();
          if (data.observations && data.observations.length > 0) {
            const rows = data.observations
              .filter((obs: any) => obs.value !== '.' && !isNaN(parseFloat(obs.value)))
              .map((obs: any) => ({
                normalizedValue: parseFloat(obs.value),
                datePeriod: obs.date,
                rawData: obs
              }));

            if (rows.length > 0) {
              const inserted = await syncManager.resolveAndStoreBatch(
                this.sourceName,
                s.code,
                s.name,
                'MACRO',
                s.code,
                rows
              );
              recordsProcessed += inserted;
            }
          }
        } catch (jsonErr: any) {
          console.warn(`[FREDAdapter] ${s.code} veri ayrıştırma uyarısı:`, jsonErr?.message || jsonErr);
        }
      }

      return {
        source: this.sourceName,
        status: 'SUCCESS',
        recordsProcessed,
        startedAt,
        completedAt: new Date()
      };
    } catch (e: any) {
      return {
        source: this.sourceName,
        status: 'ERROR',
        recordsProcessed,
        message: e.message,
        startedAt,
        completedAt: new Date()
      };
    }
  }
}
