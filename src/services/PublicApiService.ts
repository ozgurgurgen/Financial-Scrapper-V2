import { db } from '../db/index.ts';
import { 
  bistStocks, assets, assetData, tefasFunds, tefasPrices, 
  kapDisclosures, cryptoCandles, syncLogs, tefasFundHoldings, tefasHistoricalNavs
} from '../db/schema.ts';
import { eq, desc, asc, ilike, or, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { tefasHoldingsService } from './TefasHoldingsService.ts';
import { historicalBackfillService } from './HistoricalBackfillService.ts';
import { ipos } from '../db/schema.ts';
import { ipoScraperService } from './IpoScraperService.ts';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export class PublicApiService {
  /**
   * 625+ BIST Hisseleri Listesi
   */
  async getBistStocks(params: PaginationQuery & { minMarketCap?: number; maxPe?: number }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 1000);
    const offset = (page - 1) * limit;
    const search = params.search?.trim();

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        ilike(bistStocks.ticker, `%${search}%`),
        ilike(bistStocks.companyName, `%${search}%`)
      );
    }

    // Count total
    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bistStocks)
      .where(whereClause);
    const total = Number(countRes?.count || 0);

    // Dynamic order
    let orderBy = desc(bistStocks.marketCap);
    if (params.sortBy === 'ticker') {
      orderBy = params.order === 'asc' ? asc(bistStocks.ticker) : desc(bistStocks.ticker);
    } else if (params.sortBy === 'price') {
      orderBy = params.order === 'asc' ? asc(bistStocks.price) : desc(bistStocks.price);
    } else if (params.sortBy === 'changePct') {
      orderBy = params.order === 'asc' ? asc(bistStocks.changePct) : desc(bistStocks.changePct);
    } else if (params.sortBy === 'volume') {
      orderBy = params.order === 'asc' ? asc(bistStocks.volume) : desc(bistStocks.volume);
    } else if (params.sortBy === 'peRatio') {
      orderBy = params.order === 'asc' ? asc(bistStocks.peRatio) : desc(bistStocks.peRatio);
    }

    const items = await db
      .select()
      .from(bistStocks)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: items.map(s => ({
        ticker: s.ticker,
        companyName: s.companyName,
        price: parseFloat(s.price || '0'),
        changePct: parseFloat(s.changePct || '0'),
        marketCap: parseFloat(s.marketCap || '0'),
        volume: parseFloat(s.volume || '0'),
        peRatio: s.peRatio ? parseFloat(s.peRatio) : null,
        fiftyTwoWeekHigh: s.fiftyTwoWeekHigh ? parseFloat(s.fiftyTwoWeekHigh) : null,
        fiftyTwoWeekLow: s.fiftyTwoWeekLow ? parseFloat(s.fiftyTwoWeekLow) : null,
        lastUpdated: s.lastUpdated
      }))
    };
  }

  /**
   * Tek bir BIST hissesinin detayları
   */
  async getBistStockDetail(ticker: string) {
    const cleanTicker = ticker.toUpperCase().replace('.IS', '');
    const [stock] = await db
      .select()
      .from(bistStocks)
      .where(eq(bistStocks.ticker, cleanTicker))
      .limit(1);

    if (!stock) {
      return { success: false, error: `Hisse bulunamadı: ${cleanTicker}` };
    }

    // Asset tablosundan ek bilgi
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.code, cleanTicker))
      .limit(1);

    // Son tarihsel bar sayısı
    let historicalBarsCount = 0;
    if (asset) {
      const [countRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(assetData)
        .where(eq(assetData.assetId, asset.id));
      historicalBarsCount = Number(countRes?.count || 0);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        ticker: stock.ticker,
        companyName: stock.companyName,
        price: parseFloat(stock.price || '0'),
        changePct: parseFloat(stock.changePct || '0'),
        marketCap: parseFloat(stock.marketCap || '0'),
        volume: parseFloat(stock.volume || '0'),
        peRatio: stock.peRatio ? parseFloat(stock.peRatio) : null,
        fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh ? parseFloat(stock.fiftyTwoWeekHigh) : null,
        fiftyTwoWeekLow: stock.fiftyTwoWeekLow ? parseFloat(stock.fiftyTwoWeekLow) : null,
        historicalBarsCount,
        has5YearData: historicalBarsCount >= 200,
        lastUpdated: stock.lastUpdated
      }
    };
  }

  /**
   * 5 Yıllık Günlük OHLCV Fiyat Serisi
   */
  async getBistStockHistory(ticker: string, from?: string, to?: string, limit = 1500) {
    const cleanTicker = ticker.toUpperCase().replace('.IS', '');
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.code, cleanTicker))
      .limit(1);

    if (!asset) {
      return { success: false, error: `Asset kaydı bulunamadı: ${cleanTicker}` };
    }

    let query = db
      .select()
      .from(assetData)
      .where(eq(assetData.assetId, asset.id))
      .orderBy(asc(assetData.datePeriod))
      .limit(limit);

    const rows = await query;

    const bars = rows.map(r => {
      const raw = (r.rawData || {}) as any;
      const close = r.normalizedValue ? parseFloat(r.normalizedValue) : (raw.close || 0);
      return {
        date: r.datePeriod,
        open: raw.open ?? close,
        high: raw.high ?? close,
        low: raw.low ?? close,
        close: close,
        adjClose: raw.adjclose ?? close,
        volume: raw.volume ?? 0
      };
    });

    return {
      success: true,
      ticker: cleanTicker,
      totalBars: bars.length,
      firstDate: bars[0]?.date || null,
      lastDate: bars[bars.length - 1]?.date || null,
      data: bars
    };
  }

  /**
   * Hisse Teknik İndikatörleri (RSI, MACD, SMA, Bollinger Bantları)
   */
  async getStockTechnicalIndicators(ticker: string) {
    const historyRes = await this.getBistStockHistory(ticker, undefined, undefined, 500);
    if (!historyRes.success || !historyRes.data || historyRes.data.length === 0) {
      return { success: false, error: 'Yeterli tarihsel veri bulunamadı' };
    }

    const bars = historyRes.data;
    const closes = bars.map(b => b.close);
    const n = closes.length;
    const currentPrice = closes[n - 1];

    // Helper functions
    const calcSMA = (period: number) => {
      if (n < period) return null;
      const slice = closes.slice(n - period);
      return slice.reduce((a, b) => a + b, 0) / period;
    };

    const calcRSI = (period = 14) => {
      if (n <= period) return 50;
      let gains = 0;
      let losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;

      for (let i = period + 1; i < n; i++) {
        const diff = closes[i] - closes[i - 1];
        avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
        avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
      }

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };

    const sma20 = calcSMA(20);
    const sma50 = calcSMA(50);
    const sma200 = calcSMA(200);
    const rsi14 = calcRSI(14);

    // Bollinger Bands (20, 2)
    let bollingerUpper: number | null = null;
    let bollingerLower: number | null = null;
    if (sma20 && n >= 20) {
      const slice = closes.slice(n - 20);
      const variance = slice.reduce((acc, v) => acc + Math.pow(v - sma20, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      bollingerUpper = sma20 + (2 * stdDev);
      bollingerLower = sma20 - (2 * stdDev);
    }

    // Signals
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (sma50 && sma200) {
      if (sma50 > sma200 && currentPrice > sma50) trend = 'BULLISH';
      else if (sma50 < sma200 && currentPrice < sma50) trend = 'BEARISH';
    }

    let rsiCondition: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
    if (rsi14 <= 30) rsiCondition = 'OVERSOLD';
    else if (rsi14 >= 70) rsiCondition = 'OVERBOUGHT';

    return {
      success: true,
      ticker: ticker.toUpperCase(),
      currentPrice,
      indicators: {
        rsi14: parseFloat(rsi14.toFixed(2)),
        rsiCondition,
        sma20: sma20 ? parseFloat(sma20.toFixed(2)) : null,
        sma50: sma50 ? parseFloat(sma50.toFixed(2)) : null,
        sma200: sma200 ? parseFloat(sma200.toFixed(2)) : null,
        bollingerBands: {
          middle: sma20 ? parseFloat(sma20.toFixed(2)) : null,
          upper: bollingerUpper ? parseFloat(bollingerUpper.toFixed(2)) : null,
          lower: bollingerLower ? parseFloat(bollingerLower.toFixed(2)) : null
        },
        trend
      }
    };
  }

  /**
   * 1.063 TEFAS Fonları Listesi
   */
  async getTefasFunds(params: PaginationQuery & { category?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 1500);
    const offset = (page - 1) * limit;
    const search = params.search?.trim();

    let whereConditions: any[] = [];
    if (search) {
      whereConditions.push(
        or(
          ilike(tefasFunds.code, `%${search}%`),
          ilike(tefasFunds.name, `%${search}%`)
        )
      );
    }
    if (params.category && params.category !== 'Tümü') {
      whereConditions.push(ilike(tefasFunds.type, `%${params.category}%`));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Count
    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tefasFunds)
      .where(whereClause);
    const total = Number(countRes?.count || 0);

    // Fetch funds with latest prices
    const baseFundsList = await db
      .select({
        id: tefasFunds.id,
        code: tefasFunds.code,
        name: tefasFunds.name,
        type: tefasFunds.type,
        riskValue: tefasFunds.riskValue,
        managementFee: tefasFunds.managementFee,
        buyValour: tefasFunds.buyValour,
        sellValour: tefasFunds.sellValour
      })
      .from(tefasFunds)
      .where(whereClause)
      .orderBy(asc(tefasFunds.code))
      .limit(limit)
      .offset(offset);

    const fundIds = baseFundsList.map(f => f.id);
    let latestPrices = new Map<number, any>();

    if (fundIds.length > 0) {
      const pricesList = await db
        .select()
        .from(tefasPrices)
        .where(inArray(tefasPrices.fundId, fundIds))
        .orderBy(desc(tefasPrices.date));

      for (const p of pricesList) {
        if (!latestPrices.has(p.fundId)) {
          latestPrices.set(p.fundId, p);
        }
      }
    }

    const fundsList = baseFundsList.map(fund => {
      const p = latestPrices.get(fund.id) || {};
      return {
        ...fund,
        price: p.price,
        dailyChange: p.dailyChange,
        return1M: p.return1M,
        return3M: p.return3M,
        return6M: p.return6M,
        return1Y: p.return1Y,
        return3Y: p.return3Y,
        return5Y: p.return5Y,
        marketCap: p.marketCap,
        shares: p.shares,
        investorCount: p.investorCount,
        assetAllocation: p.assetAllocation,
        date: p.date
      };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: fundsList.map(f => ({
        code: f.code,
        name: f.name,
        type: f.type,
        riskValue: f.riskValue,
        managementFee: f.managementFee,
        price: f.price ? parseFloat(f.price) : null,
        returns: {
          daily: f.dailyChange ? parseFloat(f.dailyChange) : null,
          oneMonth: f.return1M ? parseFloat(f.return1M) : null,
          threeMonths: f.return3M ? parseFloat(f.return3M) : null,
          sixMonths: f.return6M ? parseFloat(f.return6M) : null,
          oneYear: f.return1Y ? parseFloat(f.return1Y) : null,
          threeYears: f.return3Y ? parseFloat(f.return3Y) : null,
          fiveYears: f.return5Y ? parseFloat(f.return5Y) : null
        },
        metrics: {
          marketCap: f.marketCap ? parseFloat(f.marketCap) : null,
          shares: f.shares ? parseFloat(f.shares) : null,
          investorCount: f.investorCount
        },
        assetAllocation: f.assetAllocation || {},
        lastPriceDate: f.date
      }))
    };
  }

  /**
   * Tekil TEFAS Fon Detayı & Varlık Dağılımı
   */
  async getTefasFundDetail(code: string) {
    const cleanCode = code.toUpperCase();
    const [fund] = await db
      .select()
      .from(tefasFunds)
      .where(eq(tefasFunds.code, cleanCode))
      .limit(1);

    if (!fund) {
      return { success: false, error: `Fon bulunamadı: ${cleanCode}` };
    }

    const [latestPrice] = await db
      .select()
      .from(tefasPrices)
      .where(eq(tefasPrices.fundId, fund.id))
      .orderBy(desc(tefasPrices.date))
      .limit(1);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        code: fund.code,
        name: fund.name,
        type: fund.type,
        riskValue: fund.riskValue,
        managementFee: fund.managementFee,
        buyValour: fund.buyValour,
        sellValour: fund.sellValour,
        latestPrice: latestPrice?.price ? parseFloat(latestPrice.price) : null,
        returns: {
          daily: latestPrice?.dailyChange ? parseFloat(latestPrice.dailyChange) : null,
          oneMonth: latestPrice?.return1M ? parseFloat(latestPrice.return1M) : null,
          threeMonths: latestPrice?.return3M ? parseFloat(latestPrice.return3M) : null,
          sixMonths: latestPrice?.return6M ? parseFloat(latestPrice.return6M) : null,
          oneYear: latestPrice?.return1Y ? parseFloat(latestPrice.return1Y) : null,
          threeYears: latestPrice?.return3Y ? parseFloat(latestPrice.return3Y) : null,
          fiveYears: latestPrice?.return5Y ? parseFloat(latestPrice.return5Y) : null
        },
        assetAllocation: latestPrice?.assetAllocation || {},
        marketCap: latestPrice?.marketCap ? parseFloat(latestPrice.marketCap) : null,
        investorCount: latestPrice?.investorCount || null,
        lastPriceDate: latestPrice?.date || null
      }
    };
  }

  /**
   * TEFAS Fonunun İçindeki Tekil Hisse Senedi & Varlık Dağılımı (Portföy Dağılım Raporu)
   */
  async getFundHoldings(fundCode: string) {
    return await tefasHoldingsService.getFundHoldings(fundCode);
  }

  /**
   * Ters Arama: Belirtilen Hisseyi (Örn: THYAO, TUPRS, BIMAS) Hangi TEFAS Fonları, Yüzde Kaç Oranında Taşıyor?
   */
  async getFundsHoldingStock(stockTicker: string) {
    return await tefasHoldingsService.getFundsHoldingStock(stockTicker);
  }

  /**
   * TEFAS Fonları Genelinde En Çok Taşınan Hisseler ve Sektör Dağılımı
   */
  async getTopStockExposureAcrossFunds() {
    return await tefasHoldingsService.getTopStockExposureAcrossFunds();
  }

  /**
   * TEFAS Fonu 5 Yıllık Günlük Fiyat / NAV Zaman Serisi
   */
  async getFundDailyHistory(fundCode: string, limit: number = 500) {
    const code = fundCode.toUpperCase();
    const rows = await db
      .select()
      .from(tefasHistoricalNavs)
      .where(eq(tefasHistoricalNavs.fundCode, code))
      .orderBy(desc(tefasHistoricalNavs.date))
      .limit(Math.min(limit, 1500));

    return {
      success: true,
      fundCode: code,
      count: rows.length,
      data: rows.map(r => ({
        date: r.date,
        price: parseFloat(r.price),
        marketCap: r.marketCap ? parseFloat(r.marketCap) : null,
        shares: r.shares ? parseFloat(r.shares) : null,
        investorCount: r.investorCount
      }))
    };
  }

  /**
   * Akıllı ve Kesintili 5 Yıllık Geçmiş Veri Aktarımı (Backfill) Durumu
   */
  async getBackfillStatus() {
    return await historicalBackfillService.getStatus();
  }

  /**
   * Manuel Geçmiş Veri Aktarımı Tetikleme
   */
  async triggerBackfill(taskName: 'BIST' | 'TEFAS' | 'CRYPTO' | 'ALL') {
    if (taskName === 'BIST' || taskName === 'ALL') {
      historicalBackfillService.startBistHistoryBackfill().catch(console.error);
    }
    if (taskName === 'TEFAS' || taskName === 'ALL') {
      historicalBackfillService.startTefasHistoryBackfill().catch(console.error);
    }
    if (taskName === 'CRYPTO' || taskName === 'ALL') {
      historicalBackfillService.startCryptoHistoryBackfill().catch(console.error);
    }
    return {
      success: true,
      message: `${taskName} 5 yıllık geçmiş veri aktarım süreci güvenli/kesintili anti-ban modunda başlatıldı.`,
      timing: historicalBackfillService.isOffPeakOrWeekend()
    };
  }

  /**
   * KAP Şirket Bildirimleri
   */
  async getKapDisclosures(params: PaginationQuery & { ticker?: string }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 30, 1), 200);
    const offset = (page - 1) * limit;

    let whereClause = undefined;
    if (params.ticker) {
      whereClause = eq(kapDisclosures.symbol, params.ticker.toUpperCase());
    }

    const [countRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kapDisclosures)
      .where(whereClause);
    const total = Number(countRes?.count || 0);

    const items = await db
      .select()
      .from(kapDisclosures)
      .where(whereClause)
      .orderBy(desc(kapDisclosures.publishDate))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: items.map(d => ({
        id: d.id,
        symbol: d.symbol,
        title: d.title,
        category: d.category,
        publishDate: d.publishDate,
        summary: d.summary,
        url: d.url
      }))
    };
  }

  /**
   * Sistem Veri Tabanı Sağlık & Tazelik Raporu
   */
  async getDatabaseHealth() {
    const [bistCount] = await db.select({ count: sql<number>`count(*)` }).from(bistStocks);
    const [tefasCount] = await db.select({ count: sql<number>`count(*)` }).from(tefasFunds);
    const [holdingsCount] = await db.select({ count: sql<number>`count(*)` }).from(tefasFundHoldings);
    const [fundNavCount] = await db.select({ count: sql<number>`count(*)` }).from(tefasHistoricalNavs);
    const [assetDataCount] = await db.select({ count: sql<number>`count(*)` }).from(assetData);
    const [kapCount] = await db.select({ count: sql<number>`count(*)` }).from(kapDisclosures);
    const [cryptoCount] = await db.select({ count: sql<number>`count(*)` }).from(cryptoCandles);

    // Son log
    const [lastLog] = await db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.startedAt))
      .limit(1);

    return {
      success: true,
      status: 'OPERATIONAL',
      service: 'BIST & TEFAS Financial Data Hub API v1',
      timestamp: new Date().toISOString(),
      databaseCounts: {
        bistStocks: Number(bistCount?.count || 0),
        tefasFunds: Number(tefasCount?.count || 0),
        tefasFundHoldingsRows: Number(holdingsCount?.count || 0),
        tefasHistoricalNavBars: Number(fundNavCount?.count || 0),
        totalBistHistoricalBars: Number(assetDataCount?.count || 0),
        kapDisclosures: Number(kapCount?.count || 0),
        cryptoCandles: Number(cryptoCount?.count || 0)
      },
      lastSyncActivity: {
        source: lastLog?.source || 'SYSTEM',
        status: lastLog?.status || 'IDLE',
        message: lastLog?.message || null,
        timestamp: lastLog?.startedAt || null
      }
    };
  }

  /**
   * Halka Arz (IPO) Verileri
   */
  async getIpos() {
    const items = await db
      .select()
      .from(ipos);

    const parseIpoDate = (dateStr: string | null) => {
      if (!dateStr) return 0;
      const lower = dateStr.toLowerCase();
      
      if (lower.includes('taslak') || lower.includes('bekleniyor') || lower.includes('onaylandı') || lower.includes('ertelendi')) {
        return new Date(2099, 0, 1).getTime();
      }

      const months: Record<string, number> = { 
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5, 
        'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11 
      };
      
      let year = new Date().getFullYear();
      let month = 0;
      let day = 1;
      
      const yearMatch = lower.match(/\b(202\d)\b/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);
      
      let monthFound = false;
      for (const [m, val] of Object.entries(months)) {
        if (lower.includes(m)) {
          month = val;
          monthFound = true;
          break;
        }
      }
      
      const dayMatches = lower.match(/\b(\d{1,2})\b/g);
      if (dayMatches && dayMatches.length > 0) {
        for (const dm of dayMatches) {
          const d = parseInt(dm, 10);
          if (d > 0 && d <= 31) { day = d; }
        }
      }

      if (!monthFound && !yearMatch) return 0;
      return new Date(year, month, day).getTime();
    };

    const sortedItems = [...items];
    sortedItems.sort((a, b) => {
      const timeA = parseIpoDate(a.dateStr);
      const timeB = parseIpoDate(b.dateStr);
      
      if (timeA === timeB) {
         return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return timeB - timeA;
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: sortedItems
    };
  }

  /**
   * Halka Arz (IPO) Senkronizasyon Tetikleme
   */
  async triggerIpoSync() {
    // Run async
    ipoScraperService.syncIpos().catch(console.error);
    return {
      success: true,
      message: 'Halka arz (IPO) senkronizasyonu arka planda başlatıldı.'
    };
  }

  /**
   * Canlı Borsa İstanbul Tavan Serisi ve Fiyat Güncelleme
   */
  async triggerTavanRefresh() {
    const count = await ipoScraperService.syncTavanData();
    return {
      success: true,
      message: `${count} adet Borsa İstanbul halka arz hissesinin tavan serisi ve anlık fiyatları güncellendi.`
    };
  }

  /**
   * Tekil Halka Arz (IPO) Detayı Getir
   */
  async getIpoByCode(companyCode: string) {
    const code = (companyCode || '').toUpperCase().trim();
    const rows = await db
      .select()
      .from(ipos)
      .where(eq(ipos.companyCode, code))
      .limit(1);

    if (rows.length === 0) {
      return {
        success: false,
        error: `Şirket kodu '${code}' ile halka arz kaydı bulunamadı.`
      };
    }

    return {
      success: true,
      data: rows[0]
    };
  }

  /**
   * OpenAPI 3.0 Standard Schema
   */
  getOpenApiSchema() {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Borsa İstanbul, TEFAS, ABD Piyasaları & Finansal Veri API Hub',
        version: '1.0.0',
        description: 'Dış web, mobil ve kurumsal sistemlerin doğrudan Borsa İstanbul (625+ hisse), TEFAS (1.063+ fon & portföy dağılım raporları), ABD Piyasaları (1.000+ hisse & ETF), KAP bildirimleri, Halka Arzlar, Analist Raporları ve 5 yıllık OHLCV barlarını çekebileceği yüksek performanslı REST API servisi.'
      },
      servers: [
        { url: '/api/v1', description: 'Canlı REST API V1' }
      ],
      paths: {
        '/bist/stocks': {
          get: {
            summary: '625+ BIST Hisseleri Listesi',
            description: 'Canlı fiyatlar, piyasa değerleri, F/K, hacim ve değişim yüzdeleriyle tüm BIST hisselerini döndürür.',
            parameters: [
              { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Hisse kodu veya şirket adı arama' },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
              { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['marketCap', 'price', 'changePct', 'volume', 'peRatio', 'ticker'] } },
              { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
            ]
          }
        },
        '/bist/stock/{ticker}': {
          get: {
            summary: 'Tek Bir BIST Hissesi Detayı',
            parameters: [
              { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'THYAO' }
            ]
          }
        },
        '/bist/stock/{ticker}/history': {
          get: {
            summary: '5 Yıllık Günlük OHLCV Fiyat Serisi',
            description: 'Açılış, Yüksek, Düşük, Kapanış, Hacim ve Düzeltilmiş Kapanış barlarını döndürür.',
            parameters: [
              { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'THYAO' },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 1500 } }
            ]
          }
        },
        '/bist/stock/{ticker}/indicators': {
          get: {
            summary: 'Hesaplanmış Teknik İndikatörler (RSI, MACD, SMA, Bollinger)',
            parameters: [
              { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'BIMAS' }
            ]
          }
        },
        '/tefas/funds': {
          get: {
            summary: '1.063 TEFAS Yatırım Fonları Listesi',
            parameters: [
              { name: 'search', in: 'query', schema: { type: 'string' } },
              { name: 'category', in: 'query', schema: { type: 'string' } },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
            ]
          }
        },
        '/tefas/fund/{code}': {
          get: {
            summary: 'Tekil TEFAS Fon Detayı & Portföy Varlık Dağılımı',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'TCD' }
            ]
          }
        },
        '/tefas/fund/{code}/holdings': {
          get: {
            summary: 'TEFAS Fonunun İçindeki Tekil Hisse Senetleri & Ağırlıkları (PDR)',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'TI2' }
            ]
          }
        },
        '/tefas/stock/{ticker}/in-funds': {
          get: {
            summary: 'Ters Arama: Belirtilen Hisseyi Taşıyan Tüm TEFAS Fonları',
            parameters: [
              { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'THYAO' }
            ]
          }
        },
        '/tefas/top-held-stocks': {
          get: {
            summary: 'TEFAS Fonları Genelinde En Çok Taşınan Hisseler Sıralaması'
          }
        },
        '/tefas/fund/{code}/daily-history': {
          get: {
            summary: 'TEFAS Fonu 5 Yıllık Günlük Fiyat & NAV Zaman Serisi',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'IIH' },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 500 } }
            ]
          }
        },
        '/us-stocks': {
          get: {
            summary: 'ABD Piyasaları Top 1.000 Şirket Listesi & Filtreleme',
            parameters: [
              { name: 'search', in: 'query', schema: { type: 'string' } },
              { name: 'sector', in: 'query', schema: { type: 'string' } },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
            ]
          }
        },
        '/us-stocks/{ticker}': {
          get: {
            summary: 'Tek Bir ABD Şirketi Detayı & Finansalları',
            parameters: [
              { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'AAPL' }
            ]
          }
        },
        '/us-etfs': {
          get: {
            summary: 'ABD Büyük ETF Listesi (SPY, QQQ, VOO vb.)',
            parameters: [
              { name: 'search', in: 'query', schema: { type: 'string' } },
              { name: 'category', in: 'query', schema: { type: 'string' } }
            ]
          }
        },
        '/us-history/{type}/{ticker}': {
          get: {
            summary: 'ABD Hissesi veya ETF İçin 5 Yıllık OHLCV, CAGR ve Drawdown Serisi',
            parameters: [
              { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['stock', 'etf'] } },
              { name: 'ticker', in: 'path', required: true, schema: { type: 'string' }, example: 'NVDA' }
            ]
          }
        },
        '/ipos': {
          get: {
            summary: 'BIST Halka Arzlar (Taslak, Onaylı, İşlem Gören ve Tavan Serileri)'
          }
        },
        '/ipos/{code}': {
          get: {
            summary: 'Tekil Halka Arz Detayı & Şirket Finansal Özeti',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'KBORU' }
            ]
          }
        },
        '/analyst-reports': {
          get: {
            summary: 'Kurumsal Analist Raporları, Hedef Fiyatlar ve Konsensüs',
            parameters: [
              { name: 'market', in: 'query', schema: { type: 'string', enum: ['BIST', 'US', 'TEFAS', 'CRYPTO', 'ALL'] } },
              { name: 'ticker', in: 'query', schema: { type: 'string' } }
            ]
          }
        },
        '/sectors/overview': {
          get: {
            summary: 'Sektörel Genel Bakış, Rotasyon Radarı & Görece Değerleme'
          }
        },
        '/sectors/stocks-heatmap': {
          get: {
            summary: 'Canlı BIST / US Hisse Ağaç Haritası (Heatmap)'
          }
        },
        '/kap/disclosures': {
          get: {
            summary: 'KAP Şirket Bildirimleri Akışı',
            parameters: [
              { name: 'ticker', in: 'query', schema: { type: 'string' } },
              { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
              { name: 'limit', in: 'query', schema: { type: 'integer', default: 30 } }
            ]
          }
        },
        '/assets/profile/{code}': {
          get: {
            summary: '360° Çapraz Varlık Profili (Hisse, Fonlar, Analist Raporları, KAP)',
            parameters: [
              { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'THYAO' }
            ]
          }
        },
        '/health': {
          get: {
            summary: 'API & Veri Tabanı Sağlık ve Tazelik Raporu'
          }
        }
      }
    };
  }
}

export const publicApiService = new PublicApiService();
