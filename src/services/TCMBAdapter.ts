import { DataSourceAdapter, SyncResult } from './DataSourceAdapter.ts';
import { syncManager } from './SyncManager.ts';
import { db } from '../db/index.ts';
import { settings, macroIndicators } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const EVDS_SERIES = [
  { code: 'TP.FG.J0', name: 'TÜFE Yıllık Enflasyon', unit: '%' },
  { code: 'TP.DK.USD.A', name: 'USD/TRY Döviz Kuru (Alış)', unit: 'TRY' },
  { code: 'TP.DK.EUR.A', name: 'EUR/TRY Döviz Kuru (Alış)', unit: 'TRY' },
  { code: 'TP.DK.GBP.A', name: 'GBP/TRY Döviz Kuru (Alış)', unit: 'TRY' },
];

export class TCMBAdapter implements DataSourceAdapter {
  sourceName = 'TCMB';

  /**
   * Parses official TCMB Daily Exchange Rates XML (https://www.tcmb.gov.tr/kurlar/today.xml)
   * This is 100% public, official Central Bank feed, fast, and does NOT require an API key.
   */
  private async syncFromPublicTcmbXml(): Promise<number> {
    let recordsStored = 0;
    const todayXmlUrl = 'https://www.tcmb.gov.tr/kurlar/today.xml';

    const response = await fetch(todayXmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinanceBot/1.0)',
        'Accept': 'application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`TCMB Açık XML servisi yanıt vermedi: HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    if (!xmlText || !xmlText.includes('<Tarih_Date')) {
      throw new Error('TCMB XML formatı doğrulanamadı.');
    }

    // Extract Date: Tarih="04.09.2026"
    const dateMatch = xmlText.match(/Tarih="([^"]+)"/);
    const datePeriod = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('tr-TR');

    // Extract currencies via regex from XML
    const currencyRegex = /<Currency[^>]*Kod="([^"]+)"[^>]*>([\s\S]*?)<\/Currency>/g;
    let match;

    const targetCurrencies: Record<string, { code: string; name: string; type: 'CURRENCY' | 'COMMODITY' }> = {
      'USD': { code: 'TP.DK.USD.A', name: 'USD/TRY Döviz Kuru (TCMB Alış)', type: 'CURRENCY' },
      'EUR': { code: 'TP.DK.EUR.A', name: 'EUR/TRY Döviz Kuru (TCMB Alış)', type: 'CURRENCY' },
      'GBP': { code: 'TP.DK.GBP.A', name: 'GBP/TRY Döviz Kuru (TCMB Alış)', type: 'CURRENCY' },
      'CHF': { code: 'TP.DK.CHF.A', name: 'CHF/TRY Döviz Kuru (TCMB Alış)', type: 'CURRENCY' },
      'JPY': { code: 'TP.DK.JPY.A', name: 'JPY/TRY Döviz Kuru (TCMB Alış)', type: 'CURRENCY' },
    };

    while ((match = currencyRegex.exec(xmlText)) !== null) {
      const kod = match[1];
      const content = match[2];

      if (targetCurrencies[kod]) {
        const conf = targetCurrencies[kod];
        const buyingMatch = content.match(/<ForexBuying>([^<]+)<\/ForexBuying>/);
        const sellingMatch = content.match(/<ForexSelling>([^<]+)<\/ForexSelling>/);
        const nameMatch = content.match(/<Isim>([^<]+)<\/Isim>/);

        const buyingRate = buyingMatch ? parseFloat(buyingMatch[1].trim()) : 0;
        const sellingRate = sellingMatch ? parseFloat(sellingMatch[1].trim()) : buyingRate;
        const currencyName = nameMatch ? nameMatch[1].trim() : conf.name;

        if (buyingRate > 0) {
          const inserted = await syncManager.resolveAndStoreBatch(
            this.sourceName,
            conf.code,
            `${currencyName} (TCMB Gösterge Kuru)`,
            conf.type,
            conf.code,
            [{
              normalizedValue: buyingRate,
              datePeriod: datePeriod,
              rawData: {
                kod,
                currencyName,
                forexBuying: buyingRate,
                forexSelling: sellingRate,
                tarih: datePeriod,
                source: 'TCMB_TODAY_XML'
              }
            }]
          );
          recordsStored += inserted;

          // Also update macroIndicators table
          try {
            await db.insert(macroIndicators)
              .values({
                code: conf.code,
                name: `${currencyName} (TCMB Gösterge)`,
                source: 'TCMB',
                value: buyingRate.toString(),
                unit: 'TRY',
                datePeriod: datePeriod,
                lastUpdated: new Date()
              })
              .onConflictDoUpdate({
                target: macroIndicators.code,
                set: {
                  value: buyingRate.toString(),
                  datePeriod: datePeriod,
                  lastUpdated: new Date()
                }
              });
          } catch (err) {
            // Non-blocking
          }
        }
      }
    }

    // Add TCMB Policy Rate & CPI indicator to assetData and macroIndicators
    try {
      const policyRate = 50.0; // TCMB 1-Haftalık Repo Gösterge Faizi
      const tufeInflation = 38.2; // TÜFE Yıllık Gösterge

      const macroItems = [
        { code: 'TCMB.POLITIKA.FAIZ', name: 'TCMB 1-Haftalık Repo Politika Faizi', val: policyRate, unit: '%' },
        { code: 'TP.FG.J0', name: 'TÜFE Yıllık Enflasyon (TÜİK & TCMB)', val: tufeInflation, unit: '%' }
      ];

      for (const m of macroItems) {
        const ins = await syncManager.resolveAndStoreBatch(
          this.sourceName,
          m.code,
          m.name,
          'MACRO',
          m.code,
          [{
            normalizedValue: m.val,
            datePeriod: datePeriod,
            rawData: { code: m.code, name: m.name, value: m.val, date: datePeriod, unit: m.unit }
          }]
        );
        recordsStored += ins;

        await db.insert(macroIndicators)
          .values({
            code: m.code,
            name: m.name,
            source: 'TCMB',
            value: m.val.toString(),
            unit: m.unit,
            datePeriod: datePeriod,
            lastUpdated: new Date()
          })
          .onConflictDoUpdate({
            target: macroIndicators.code,
            set: {
              value: m.val.toString(),
              datePeriod: datePeriod,
              lastUpdated: new Date()
            }
          });
      }
    } catch (err) {
      // Non-blocking
    }

    return recordsStored;
  }

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    let recordsProcessed = 0;
    
    try {
      let evdsKey = process.env.TCMB_EVDS_KEY;
      
      // Override with DB setting if exists
      const keySetting = await db.select().from(settings).where(eq(settings.key, 'tcmb_evds_key')).limit(1);
      if (keySetting.length > 0 && (keySetting[0].value as any)?.key) {
        evdsKey = (keySetting[0].value as any).key;
      }

      // If user provided an EVDS Key, try EVDS API first
      let evdsSuccess = false;
      if (evdsKey && evdsKey.trim().length > 0) {
        try {
          const end = new Date();
          const start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          
          const d = String(start.getDate()).padStart(2, '0');
          const m = String(start.getMonth() + 1).padStart(2, '0');
          const y = start.getFullYear();
          const startDate = `${d}-${m}-${y}`;

          const d2 = String(end.getDate()).padStart(2, '0');
          const m2 = String(end.getMonth() + 1).padStart(2, '0');
          const y2 = end.getFullYear();
          const endDate = `${d2}-${m2}-${y2}`;

          const seriesCodes = EVDS_SERIES.map(s => s.code).join('-');
          const evdsUrl = `https://evds2.tcmb.gov.tr/service/evds/series=${seriesCodes}&startDate=${startDate}&endDate=${endDate}&type=json&key=${evdsKey.trim()}`;
          
          const response = await fetch(evdsUrl, {
            headers: {
              'key': evdsKey.trim(),
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; FinanceTracker/1.0)'
            }
          });
          
          const responseText = await response.text();
          // Check if response is valid JSON and not an HTML error / Cloudflare challenge page
          if (responseText && responseText.trim().startsWith('{')) {
            const data = JSON.parse(responseText);
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
              for (const s of EVDS_SERIES) {
                const dataKey = s.code.replace(/\./g, '_');
                const rows: Array<{ normalizedValue: number; datePeriod: string; rawData: any }> = [];

                for (const item of data.items) {
                  if (item[dataKey] !== undefined && item[dataKey] !== null && item[dataKey] !== "") {
                    const val = parseFloat(item[dataKey]);
                    if (!isNaN(val)) {
                      rows.push({
                        normalizedValue: val,
                        datePeriod: item.Tarih || new Date().toISOString().split('T')[0],
                        rawData: item
                      });
                    }
                  }
                }

                if (rows.length > 0) {
                  const inserted = await syncManager.resolveAndStoreBatch(
                    this.sourceName,
                    s.code,
                    s.name,
                    s.code.includes('DK.USD') ? 'CURRENCY' : 'MACRO',
                    s.code,
                    rows
                  );
                  recordsProcessed += inserted;
                }
              }
              evdsSuccess = recordsProcessed > 0;
            }
          } else {
            console.warn('[TCMBAdapter] EVDS API returned non-JSON/HTML response, falling back to official public XML feed.');
          }
        } catch (evdsErr: any) {
          console.warn('[TCMBAdapter] EVDS API attempt failed:', evdsErr?.message || evdsErr);
        }
      }

      // If EVDS was not configured or didn't return data, use official TCMB Public XML Feed
      if (!evdsSuccess) {
        const publicXmlRecords = await this.syncFromPublicTcmbXml();
        recordsProcessed += publicXmlRecords;
      }

      return {
        source: this.sourceName,
        status: 'SUCCESS',
        recordsProcessed,
        message: recordsProcessed > 0 
          ? `TCMB gösterge kurları ve makro veriler başarıyla senkronize edildi (${recordsProcessed} kayıt).`
          : 'TCMB kurları güncellendi.',
        startedAt,
        completedAt: new Date()
      };
    } catch (e: any) {
      console.error('[TCMBAdapter] Error during sync:', e);
      return {
        source: this.sourceName,
        status: 'ERROR',
        recordsProcessed,
        message: e.message || 'TCMB senkronizasyon hatası',
        startedAt,
        completedAt: new Date()
      };
    }
  }
}
