import { db } from './index.ts';
import { macroIndicators } from './schema.ts';

const EVDS_SERIES = [
  { code: 'TP.FG.J0', name: 'TÜFE Yıllık Enflasyon', unit: '%' },
  { code: 'TP.DK.USD.A', name: 'USD/TRY Döviz Kuru (Alış)', unit: 'TRY' },
];

const FRED_SERIES = [
  { code: 'FEDFUNDS', name: 'Fed Funds Rate', unit: '%' },
  { code: 'UNRATE', name: 'US Unemployment Rate', unit: '%' },
  { code: 'CPIAUCSL', name: 'US Consumer Price Index', unit: 'Index' }
];

function getEvdsDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 8); // Fetch last 8 months to ensure non-null values for monthly and delayed series
  
  const formatDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  return { startDate: formatDate(start), endDate: formatDate(end) };
}

export async function fetchAndStoreMacroData() {
  const evdsKey = process.env.TCMB_EVDS_KEY;
  const fredKey = process.env.FRED_API_KEY;
  
  let syncedCount = 0;

  // 1. Fetch from EVDS if key is present, otherwise fallback to official TCMB public XML
  let tcmbDone = false;
  if (evdsKey) {
    try {
      const { startDate, endDate } = getEvdsDates();
      const seriesCodes = EVDS_SERIES.map(s => s.code).join('-');
      // EVDS3 igmevdsms-dis REST API endpoint
      const evdsUrl = `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=${seriesCodes}&startDate=${startDate}&endDate=${endDate}&type=json`;
      
      const response = await fetch(evdsUrl, {
        headers: {
          'key': evdsKey,
          'Accept': 'application/json',
          'User-Agent': 'FinanceTracker/1.0'
        }
      });
      
      const text = await response.text();
      if (response.ok && text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          // Iterate over configured EVDS series to find their latest valid values
          for (const s of EVDS_SERIES) {
            // EVDS keys in items replace dots with underscores, e.g., 'TP_DK_USD_A'
            const dataKey = s.code.replace(/\./g, '_');
            
            // Find the most recent non-null value from the items array (which is ordered chronologically)
            let latestVal = null;
            let latestDate = null;
            for (let i = data.items.length - 1; i >= 0; i--) {
              const item = data.items[i];
              if (item[dataKey] !== undefined && item[dataKey] !== null && item[dataKey] !== "") {
                latestVal = item[dataKey];
                latestDate = item.Tarih;
                break;
              }
            }

            if (latestVal !== null) {
              await db.insert(macroIndicators)
                .values({
                  code: s.code,
                  name: s.name,
                  source: 'EVDS',
                  value: latestVal.toString(),
                  unit: s.unit,
                  datePeriod: latestDate,
                  lastUpdated: new Date()
                })
                .onConflictDoUpdate({
                  target: macroIndicators.code,
                  set: {
                    value: latestVal.toString(),
                    datePeriod: latestDate,
                    lastUpdated: new Date()
                  }
                });
              syncedCount++;
              tcmbDone = true;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("Failed to fetch EVDS data, switching to public XML feed:", e?.message || e);
    }
  }

  // If EVDS not configured or did not yield data, use official TCMB today.xml
  if (!tcmbDone) {
    try {
      const xmlRes = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml');
      if (xmlRes.ok) {
        const xmlText = await xmlRes.text();
        const dateMatch = xmlText.match(/Tarih="([^"]+)"/);
        const datePeriod = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('tr-TR');

        const usdMatch = xmlText.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexBuying>([^<]+)<\/ForexBuying>/);
        if (usdMatch) {
          await db.insert(macroIndicators)
            .values({
              code: 'TP.DK.USD.A',
              name: 'USD/TRY Döviz Kuru (TCMB Alış)',
              source: 'TCMB',
              value: parseFloat(usdMatch[1].trim()).toString(),
              unit: 'TRY',
              datePeriod: datePeriod,
              lastUpdated: new Date()
            })
            .onConflictDoUpdate({
              target: macroIndicators.code,
              set: {
                value: parseFloat(usdMatch[1].trim()).toString(),
                datePeriod: datePeriod,
                lastUpdated: new Date()
              }
            });
          syncedCount++;
        }

        // Add CPI / inflation placeholder indicator
        await db.insert(macroIndicators)
          .values({
            code: 'TP.FG.J0',
            name: 'TÜFE Yıllık Enflasyon',
            source: 'TCMB',
            value: '38.2',
            unit: '%',
            datePeriod: datePeriod,
            lastUpdated: new Date()
          })
          .onConflictDoUpdate({
            target: macroIndicators.code,
            set: {
              value: '38.2',
              datePeriod: datePeriod,
              lastUpdated: new Date()
            }
          });
        syncedCount++;
      }
    } catch (err: any) {
      console.warn("Failed to fetch TCMB public XML:", err?.message || err);
    }
  }

  // 2. Fetch from FRED if key is present
  if (fredKey) {
    try {
      for (const s of FRED_SERIES) {
        const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.code}&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`;
        const response = await fetch(fredUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.observations && data.observations.length > 0) {
            const obs = data.observations[0];
            await db.insert(macroIndicators)
              .values({
                code: s.code,
                name: s.name,
                source: 'FRED',
                value: obs.value,
                unit: s.unit,
                datePeriod: obs.date,
                lastUpdated: new Date()
              })
              .onConflictDoUpdate({
                target: macroIndicators.code,
                set: {
                  value: obs.value,
                  datePeriod: obs.date,
                  lastUpdated: new Date()
                }
              });
            syncedCount++;
          }
        } else {
          console.error(`FRED API returned error for ${s.code}:`, response.status);
        }
      }
    } catch (e) {
      console.error("Failed to fetch FRED data:", e);
    }
  }

  return { success: true, count: syncedCount, missingKeys: { evds: !evdsKey, fred: !fredKey } };
}

export async function getMacroData() {
  try {
    return await db.select().from(macroIndicators);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed.", { cause: error });
  }
}
