import axios from 'axios';
import * as cheerio from 'cheerio';
import YahooFinance from 'yahoo-finance2';
import { db } from '../db/index.ts';
import { assets, assetMappings, assetData, bistStocks, syncLogs } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface BistCompany {
  ticker: string;
  name: string;
  city?: string;
}

export interface BistSyncProgress {
  isSyncing: boolean;
  phase: 'IDLE' | 'FETCHING_TICKERS' | 'SYNCING_QUOTES' | 'SYNCING_5Y_HISTORY' | 'COMPLETED';
  totalStocks: number;
  quotesSynced: number;
  historySynced: number;
  currentTicker: string;
  totalHistoricalRecords: number;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
}

class BistUniverseService {
  private progress: BistSyncProgress = {
    isSyncing: false,
    phase: 'IDLE',
    totalStocks: 0,
    quotesSynced: 0,
    historySynced: 0,
    currentTicker: '',
    totalHistoricalRecords: 0
  };

  getProgress(): BistSyncProgress {
    return { ...this.progress };
  }

  /**
   * KAP üzerinden Borsa İstanbul'da kayıtlı tüm şirketleri çeker
   */
  async fetchAllCompaniesFromKAP(): Promise<BistCompany[]> {
    try {
      const res = await axios.get('https://www.kap.org.tr/tr/bist-sirketler', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 20000
      });

      const $ = cheerio.load(res.data);
      const companiesMap = new Map<string, BistCompany>();

      $('table tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length >= 2) {
          const ticker = $(tds[0]).text().trim();
          const name = $(tds[1]).text().trim();
          const city = tds.length >= 3 ? $(tds[2]).text().trim() : '';

          if (ticker && ticker.length <= 6 && /^[A-Z0-9]+$/.test(ticker)) {
            companiesMap.set(ticker, {
              ticker,
              name: name || ticker,
              city
            });
          }
        }
      });

      const list = Array.from(companiesMap.values());
      if (list.length > 100) {
        return list;
      }
    } catch (err: any) {
      console.warn('KAP sirketler fetch failed, using fallback universe:', err.message);
    }

    // Fallback: Temel ve bilinen geniş BIST listesi
    return this.getFallbackBistList();
  }

  /**
   * BIST şirketlerinin anlık canlı piyasa fiyatlarını (625 hisse) çeker ve bist_stocks tablosuna kaydeder
   */
  async syncAllQuotes(companies?: BistCompany[]): Promise<{ total: number; validCount: number }> {
    const list = companies && companies.length > 0 ? companies : await this.fetchAllCompaniesFromKAP();
    this.progress.phase = 'SYNCING_QUOTES';
    this.progress.totalStocks = list.length;
    this.progress.quotesSynced = 0;

    const companyMap = new Map(list.map(c => [c.ticker, c]));
    const CHUNK_SIZE = 40;
    let validCount = 0;

    console.log(`[BistUniverse] ${list.length} BIST hissesi için canlı fiyat senkronizasyonu başlatılıyor...`);

    for (let i = 0; i < list.length; i += CHUNK_SIZE) {
      const chunk = list.slice(i, i + CHUNK_SIZE);
      const symbols = chunk.map(c => `${c.ticker}.IS`);

      try {
        const quotes = await yahoo.quote(symbols) as any[];

        for (const q of quotes) {
          if (!q || !q.symbol) continue;
          const cleanTicker = q.symbol.replace('.IS', '');
          const comp = companyMap.get(cleanTicker);
          const companyName = comp?.name || q.shortName || cleanTicker;
          const price = q.regularMarketPrice ?? 0;
          const changePct = q.regularMarketChangePercent ?? 0;
          const marketCap = q.marketCap ?? null;
          const volume = q.regularMarketVolume ?? null;
          const peRatio = q.trailingPE ?? null;
          const high52 = q.fiftyTwoWeekHigh ?? null;
          const low52 = q.fiftyTwoWeekLow ?? null;

          if (price > 0) {
            validCount++;

            // 1. bist_stocks tablosuna upsert et
            await db.insert(bistStocks).values({
              ticker: cleanTicker,
              companyName,
              price: price.toString(),
              changePct: changePct.toString(),
              marketCap: marketCap ? marketCap.toString() : null,
              volume: volume ? volume.toString() : null,
              peRatio: peRatio ? peRatio.toString() : null,
              fiftyTwoWeekHigh: high52 ? high52.toString() : null,
              fiftyTwoWeekLow: low52 ? low52.toString() : null,
              lastUpdated: new Date()
            }).onConflictDoUpdate({
              target: bistStocks.ticker,
              set: {
                companyName,
                price: price.toString(),
                changePct: changePct.toString(),
                marketCap: marketCap ? marketCap.toString() : null,
                volume: volume ? volume.toString() : null,
                peRatio: peRatio ? peRatio.toString() : null,
                fiftyTwoWeekHigh: high52 ? high52.toString() : null,
                fiftyTwoWeekLow: low52 ? low52.toString() : null,
                lastUpdated: new Date()
              }
            });

            // 2. assets tablosuna kaydet
            let [asset] = await db.select().from(assets).where(eq(assets.code, cleanTicker));
            if (!asset) {
              const [newAsset] = await db.insert(assets).values({
                code: cleanTicker,
                name: companyName,
                type: 'STOCK',
                isActive: true
              }).returning();
              asset = newAsset;

              await db.insert(assetMappings).values({
                assetId: asset.id,
                source: 'YAHOO',
                sourceCode: `${cleanTicker}.IS`
              });
            } else if (asset.name !== companyName) {
              await db.update(assets).set({ name: companyName }).where(eq(assets.id, asset.id));
            }
          }
        }

        this.progress.quotesSynced = validCount;
      } catch (err: any) {
        console.warn(`[BistUniverse] Chunk ${i}-${i + CHUNK_SIZE} quote fetch hatası:`, err.message);
      }

      // Yahoo Finance rate-limit koruması
      await new Promise(r => setTimeout(r, 250));
    }

    console.log(`[BistUniverse] Canlı fiyat senkronizasyonu tamamlandı: ${validCount} aktif hisse kaydedildi.`);
    return { total: list.length, validCount };
  }

  /**
   * Tek bir hissenin 5 yıllık tarihsel bar (OHLCV) verilerini çeker ve asset_data tablosuna yazar
   */
  async syncStock5YearHistory(ticker: string, period1: string = '2021-09-01'): Promise<number> {
    const symbol = `${ticker}.IS`;
    try {
      const chart = await yahoo.chart(symbol, {
        period1,
        interval: '1d'
      });

      if (!chart || !chart.quotes || chart.quotes.length === 0) {
        return 0;
      }

      let [asset] = await db.select().from(assets).where(eq(assets.code, ticker));
      if (!asset) {
        const [newAsset] = await db.insert(assets).values({
          code: ticker,
          name: ticker,
          type: 'STOCK',
          isActive: true
        }).returning();
        asset = newAsset;

        await db.insert(assetMappings).values({
          assetId: asset.id,
          source: 'YAHOO',
          sourceCode: symbol
        });
      }

      // Veritabanına toplu ekleme
      const rowsToInsert: any[] = [];
      for (const q of chart.quotes) {
        if (!q || q.close === null || q.close === undefined || isNaN(q.close)) continue;
        const dateStr = q.date instanceof Date 
          ? q.date.toISOString().split('T')[0] 
          : new Date(q.date).toISOString().split('T')[0];

        rowsToInsert.push({
          assetId: asset.id,
          source: 'YAHOO',
          normalizedValue: q.close.toString(),
          datePeriod: dateStr,
          rawData: {
            open: q.open ?? q.close,
            high: q.high ?? q.close,
            low: q.low ?? q.close,
            close: q.close,
            adjclose: q.adjclose ?? q.close,
            volume: q.volume ?? 0
          },
          timestamp: new Date(dateStr)
        });
      }

      if (rowsToInsert.length > 0) {
        // Eski kayıtları temizleyip yenilerini ekleyelim
        await db.delete(assetData).where(eq(assetData.assetId, asset.id));

        const INSERT_CHUNK = 500;
        for (let i = 0; i < rowsToInsert.length; i += INSERT_CHUNK) {
          await db.insert(assetData).values(rowsToInsert.slice(i, i + INSERT_CHUNK));
        }
      }

      return rowsToInsert.length;
    } catch (err: any) {
      console.warn(`[BistUniverse] ${ticker} 5Y geçmiş veri çekilemedi:`, err.message);
      return 0;
    }
  }

  /**
   * Tüm 625 BIST hissesinin hem canlı fiyatlarını hem de 5 yıllık tüm geçmişini arka planda çeken ana pipeline
   */
  async startBackgroundFullSync(): Promise<void> {
    if (this.progress.isSyncing) {
      console.log('[BistUniverse] Zaten bir senkronizasyon devam ediyor.');
      return;
    }

    this.progress = {
      isSyncing: true,
      phase: 'FETCHING_TICKERS',
      totalStocks: 0,
      quotesSynced: 0,
      historySynced: 0,
      currentTicker: '',
      totalHistoricalRecords: 0,
      startedAt: new Date().toISOString()
    };

    (async () => {
      try {
        // 1. Tüm şirketleri KAP'tan çek
        const companies = await this.fetchAllCompaniesFromKAP();
        this.progress.totalStocks = companies.length;

        // 2. Tüm hisselerin canlı fiyat, hacim, F/K, piyasa değerini çekip kaydet
        const quoteRes = await this.syncAllQuotes(companies);
        this.progress.quotesSynced = quoteRes.validCount;

        // 3. Veritabanındaki tüm aktif BIST hisselerini listele
        const allDbStocks = await db.select({ ticker: bistStocks.ticker }).from(bistStocks);
        const stockTickers = allDbStocks.map(s => s.ticker);
        this.progress.totalStocks = stockTickers.length;
        this.progress.phase = 'SYNCING_5Y_HISTORY';

        console.log(`[BistUniverse] ${stockTickers.length} aktif hisse için 5 yıllık derin geçmiş veri çekimine başlanıyor...`);

        // 4. Her bir hissenin 5 yıllık geçmişini çek (Eşzamanlı Concurrency: 6)
        let processedHistory = 0;
        let totalRecords = 0;
        const CONCURRENCY = 6;

        for (let i = 0; i < stockTickers.length; i += CONCURRENCY) {
          const chunk = stockTickers.slice(i, i + CONCURRENCY);
          const chunkResults = await Promise.all(
            chunk.map(async (ticker) => {
              this.progress.currentTicker = ticker;
              const count = await this.syncStock5YearHistory(ticker, '2021-09-01');
              return { ticker, count };
            })
          );

          for (const res of chunkResults) {
            if (res.count > 0) {
              totalRecords += res.count;
              processedHistory++;
            }
          }

          this.progress.historySynced = processedHistory;
          this.progress.totalHistoricalRecords = totalRecords;

          if (i % 30 === 0 || i + CONCURRENCY >= stockTickers.length) {
            console.log(`[BistUniverse] 5 Yıllık İlerleme: ${processedHistory} / ${stockTickers.length} hisse tamamlandı (${totalRecords} bar depolandı)`);
          }

          // Kısa bekleme
          await new Promise(r => setTimeout(r, 100));
        }

        this.progress.isSyncing = false;
        this.progress.phase = 'COMPLETED';
        this.progress.completedAt = new Date().toISOString();

        console.log(`[BistUniverse] TÜM BIST 5 YILLIK SENKRONİZASYONU TAMAMLANDI! Toplam ${totalRecords} bar depolandı.`);
      } catch (err: any) {
        console.error('[BistUniverse] Senkronizasyon hatası:', err);
        this.progress.isSyncing = false;
        this.progress.lastError = err.message;
      }
    })();
  }

  /**
   * Fallback list of top BIST companies with real names & tickers
   */
  private getFallbackBistList(): BistCompany[] {
    return [
      { ticker: 'THYAO', name: 'Türk Hava Yolları' },
      { ticker: 'GARAN', name: 'Garanti BBVA' },
      { ticker: 'AKBNK', name: 'Akbank' },
      { ticker: 'ISCTR', name: 'Türkiye İş Bankası' },
      { ticker: 'YKBNK', name: 'Yapı ve Kredi Bankası' },
      { ticker: 'VAKBN', name: 'Türkiye Vakıflar Bankası' },
      { ticker: 'HALKB', name: 'Türkiye Halk Bankası' },
      { ticker: 'KCHOL', name: 'Koç Holding' },
      { ticker: 'SAHOL', name: 'Hacı Ömer Sabancı Holding' },
      { ticker: 'SISE', name: 'Türkiye Şişe ve Cam Fabrikaları' },
      { ticker: 'EREGL', name: 'Ereğli Demir ve Çelik Fabrikaları' },
      { ticker: 'KRDMD', name: 'Kardemir Karabük Demir Çelik (D)' },
      { ticker: 'ASELS', name: 'Aselsan Elektronik Sanayi' },
      { ticker: 'TUPRS', name: 'Tüpraş Türkiye Petrol Rafinerileri' },
      { ticker: 'PETKM', name: 'Petkim Petrokimya Holding' },
      { ticker: 'BIMAS', name: 'BİM Birleşik Mağazalar' },
      { ticker: 'MGROS', name: 'Migros Ticaret' },
      { ticker: 'SOKM', name: 'Şok Marketler Ticaret' },
      { ticker: 'FROTO', name: 'Ford Otomotiv Sanayi' },
      { ticker: 'TOASO', name: 'Tofaş Türk Otomobil Fabrikası' },
      { ticker: 'TCELL', name: 'Turkcell İletişim Hizmetleri' },
      { ticker: 'TTKOM', name: 'Türk Telekomünikasyon' },
      { ticker: 'PGSUS', name: 'Pegasus Hava Taşımacılığı' },
      { ticker: 'TAVHL', name: 'TAV Havalimanları Holding' },
      { ticker: 'CCOLA', name: 'Coca-Cola İçecek' },
      { ticker: 'AEFES', name: 'Anadolu Efes Biracılık' },
      { ticker: 'ARCLK', name: 'Arçelik' },
      { ticker: 'VESTL', name: 'Vestel Elektronik Sanayi' },
      { ticker: 'VESBE', name: 'Vestel Beyaz Eşya' },
      { ticker: 'ENKAI', name: 'Enka İnşaat ve Sanayi' },
      { ticker: 'EKGYO', name: 'Emlak Konut Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'KOZAL', name: 'Koza Altın İşletmeleri' },
      { ticker: 'KOZAA', name: 'Koza Anadolu Metal Madencilik' },
      { ticker: 'IPEKE', name: 'İpek Doğal Enerji Kaynakları' },
      { ticker: 'ASTOR', name: 'Astor Enerji' },
      { ticker: 'EUPWR', name: 'Europower Enerji ve Otomasyon' },
      { ticker: 'GESAN', name: 'Girişim Elektrik Sanayi' },
      { ticker: 'KONTR', name: 'Kontrolmatik Teknoloji Enerji' },
      { ticker: 'CWENE', name: 'CW Enerji Mühendislik' },
      { ticker: 'SMRTG', name: 'Smart Güneş Enerjisi Teknolojileri' },
      { ticker: 'ALFAS', name: 'Alfa Solar Enerji Sanayi' },
      { ticker: 'ENJSA', name: 'Enerjisa Enerji' },
      { ticker: 'AKSEN', name: 'Aksa Enerji Üretim' },
      { ticker: 'ODAS', name: 'Odaş Elektrik Üretim' },
      { ticker: 'ZOREN', name: 'Zorlu Enerji Elektrik Üretim' },
      { ticker: 'ALARK', name: 'Alarko Holding' },
      { ticker: 'GUBRF', name: 'Gübre Fabrikaları' },
      { ticker: 'HEKTS', name: 'Hektaş Ticaret' },
      { ticker: 'SASA', name: 'SASA Polyester Sanayi' },
      { ticker: 'MAVI', name: 'Mavi Giyim Sanayi' },
      { ticker: 'BRISA', name: 'Brisa Bridgestone Sabancı Lastik' },
      { ticker: 'KORDS', name: 'Kordsa Teknik Tekstil' },
      { ticker: 'OTKAR', name: 'Otokar Otomotiv ve Savunma Sanayi' },
      { ticker: 'DOAS', name: 'Doğuş Otomotiv Servis ve Ticaret' },
      { ticker: 'TKFEN', name: 'Tekfen Holding' },
      { ticker: 'MIATK', name: 'Mia Teknoloji' },
      { ticker: 'REEDR', name: 'Reeder Teknoloji Sanayi' },
      { ticker: 'SDTTR', name: 'SDT Uzay ve Savunma Teknolojileri' },
      { ticker: 'TABGD', name: 'TAB Gıda Sanayi ve Ticaret' },
      { ticker: 'OBAMS', name: 'Oba Makarnacılık Sanayi' },
      { ticker: 'AGROT', name: 'Agrotech Yüksek Teknoloji ve Tarım' },
      { ticker: 'CIMSA', name: 'Çimsa Çimento Sanayi' },
      { ticker: 'OYAKC', name: 'Oyak Çimento Fabrikaları' },
      { ticker: 'AKCNS', name: 'Akçansa Çimento Sanayi' },
      { ticker: 'BUCIM', name: 'Bursa Çimento Fabrikası' },
      { ticker: 'NUHCM', name: 'Nuh Çimento Sanayi' },
      { ticker: 'ECILC', name: 'Eczacıbaşı İlaç Sınai ve Finansal Yatırımlar' },
      { ticker: 'GENIL', name: 'Gen İlaç ve Sağlık Ürünleri' },
      { ticker: 'MPARK', name: 'MLP Sağlık Hizmetleri' },
      { ticker: 'ISMEN', name: 'İş Yatırım Menkul Değerler' },
      { ticker: 'INFO', name: 'İnfo Yatırım Menkul Değerler' },
      { ticker: 'OSMEN', name: 'Osmanlı Yatırım Menkul Değerler' },
      { ticker: 'TSKB', name: 'Türkiye Sınai Kalkınma Bankası' },
      { ticker: 'SKBNK', name: 'Şekerbank' },
      { ticker: 'TURSG', name: 'Türkiye Sigorta' },
      { ticker: 'ANHYT', name: 'Anadolu Hayat Emeklilik' },
      { ticker: 'AGESA', name: 'Agesa Hayat ve Emeklilik' },
      { ticker: 'CLEBI', name: 'Çelebi Hava Servisi' },
      { ticker: 'BRYAT', name: 'Borusan Yatırım ve Pazarlama' },
      { ticker: 'BRSAN', name: 'Borusan Birleşik Boru Fabrikaları' },
      { ticker: 'BFREN', name: 'Bosch Fren Sistemleri' },
      { ticker: 'KONYA', name: 'Konya Çimento Sanayi' },
      { ticker: 'EGEEN', name: 'Ege Endüstri ve Ticaret' },
      { ticker: 'LOGO', name: 'Logo Yazılım Sanayi' },
      { ticker: 'INDES', name: 'İndeks Bilgisayar Sistemleri' },
      { ticker: 'TRGYO', name: 'Torunlar Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'ISGYO', name: 'İş Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'SNGYO', name: 'Sinpaş Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'OZKGY', name: 'Özak Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'DGGYO', name: 'Doğuş Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'PSGYO', name: 'Pasifik Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'KLGYO', name: 'Kiler Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'HLGYO', name: 'Halk Gayrimenkul Yatırım Ortaklığı' },
      { ticker: 'VAKKO', name: 'Vakko Tekstil ve Hazır Giyim' },
      { ticker: 'YUNSA', name: 'Yünsa Yünlü Sanayi' },
      { ticker: 'KCAER', name: 'Kocaer Çelik Sanayi' },
      { ticker: 'CEMTS', name: 'Çemtaş Çelik Makina Sanayi' }
    ];
  }
}

export const bistUniverseService = new BistUniverseService();
