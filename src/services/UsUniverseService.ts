import YahooFinance from 'yahoo-finance2';
import { db } from '../db/index.ts';
import { usStocks, syncLogs } from '../db/schema.ts';
import { eq, sql, desc, asc, ilike, or, and } from 'drizzle-orm';
import { appEventBus } from './AppEventBus.ts';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface UsStockItem {
  id?: number;
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange: 'NASDAQ' | 'NYSE';
  rank: number;
  price: number;
  changePct: number;
  change: number;
  marketCap: number;
  marketCapFormatted: string;
  volume: number;
  avgVolume: number;
  peRatio: number;
  forwardPe: number;
  pegRatio: number;
  priceToBook: number;
  priceToSales: number;
  enterpriseValue: number;
  dividendYield: number;
  dividendDate?: string;
  eps: number;
  forwardEps: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  targetPrice: number;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Underperform' | 'Sell';
  analystRating: number;
  revenue: number;
  netIncome: number;
  profitMargin: number;
  operatingMargin: number;
  returnOnEquity: number;
  returnOnAssets: number;
  debtToEquity: number;
  freeCashFlow: number;
  shortRatio: number;
  sharesOutstanding: number;
  country: string;
  city?: string;
  state?: string;
  website?: string;
  ceo?: string;
  fullTimeEmployees?: number;
  description?: string;
  lastUpdated?: Date;
}

export interface UsSyncProgress {
  isSyncing: boolean;
  phase: 'IDLE' | 'SYNCING_QUOTES' | 'CALCULATING_METRICS' | 'COMPLETED' | 'ERROR';
  totalStocks: number;
  syncedCount: number;
  currentTicker: string;
  lastSyncTime?: string;
  lastError?: string;
}

// TOP 1,000 US COMPANIES MASTER SEED UNIVERSE
import { TOP_1000_US_COMPANIES_SEED } from './usStocksUniverseData.ts';

class UsUniverseService {
  private progress: UsSyncProgress = {
    isSyncing: false,
    phase: 'IDLE',
    totalStocks: 1000,
    syncedCount: 0,
    currentTicker: '',
  };

  private memoryCache: UsStockItem[] = [];
  private lastCacheTime = 0;
  private readonly CACHE_TTL = 30000; // 30s in-memory cache

  getProgress(): UsSyncProgress {
    return { ...this.progress };
  }

  /**
   * Return the static universe master list of 1000 largest US companies
   */
  getSeedUniverse(): typeof TOP_1000_US_COMPANIES_SEED {
    return TOP_1000_US_COMPANIES_SEED;
  }

  /**
   * Helper to format market cap e.g. 3.45T, 850.2B, 45.3M
   */
  formatMarketCap(cap: number): string {
    if (!cap || isNaN(cap)) return '$0';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  }

  /**
   * Seeds the US stocks universe from official master list if database is empty
   */
  async ensureDatabaseSeeded(): Promise<number> {
    try {
      const existing = await db.select({ count: sql`count(*)` }).from(usStocks);
      const count = Number(existing[0]?.count || 0);
      if (count >= 50) {
        return count;
      }

      console.log('[US Universe] Seeding master stock list into database...');
      const recordsToInsert = TOP_1000_US_COMPANIES_SEED.map((s, idx) => ({
        ticker: s.ticker,
        companyName: s.companyName,
        sector: s.sector,
        industry: s.industry,
        exchange: s.exchange,
        rank: (s as any).rank || idx + 1,
        price: String(s.price),
        changePct: String(s.changePct),
        change: String(s.change),
        marketCap: String(s.marketCap),
        marketCapFormatted: this.formatMarketCap(s.marketCap),
        volume: String(s.volume || 1000000),
        avgVolume: String(s.avgVolume || 1000000),
        peRatio: String(s.peRatio || 25),
        forwardPe: String(s.forwardPe || 22),
        pegRatio: String(s.pegRatio || 1.5),
        priceToBook: String(s.priceToBook || 4.5),
        priceToSales: String(s.priceToSales || 3.2),
        enterpriseValue: String(s.enterpriseValue || s.marketCap),
        dividendYield: String(s.dividendYield || 0),
        eps: String(s.eps || 3.5),
        forwardEps: String(s.forwardEps || 4.0),
        beta: String(s.beta || 1.0),
        fiftyTwoWeekHigh: String(s.fiftyTwoWeekHigh || s.price * 1.2),
        fiftyTwoWeekLow: String(s.fiftyTwoWeekLow || s.price * 0.8),
        targetPrice: String(s.targetPrice || s.price * 1.15),
        recommendation: s.recommendation || 'Buy',
        analystRating: String(s.analystRating || 2.0),
        country: s.country || 'United States',
        website: s.website,
        ceo: s.ceo,
        fullTimeEmployees: s.fullTimeEmployees,
        description: s.description,
        lastUpdated: new Date()
      }));

      for (let i = 0; i < recordsToInsert.length; i += 100) {
        const chunk = recordsToInsert.slice(i, i + 100);
        await db.insert(usStocks)
          .values(chunk)
          .onConflictDoNothing();
      }

      console.log(`[US Universe] Successfully inserted ${recordsToInsert.length} US stocks.`);
      return recordsToInsert.length;
    } catch (e: any) {
      console.warn('[US Universe] Seeding error:', e.message);
      return 0;
    }
  }

  /**
   * Fetch paginated and filtered US stocks
   */
  async getStocks(params: {
    search?: string;
    sector?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    stocks: UsStockItem[];
    total: number;
    page: number;
    totalPages: number;
    sectorStats: { sector: string; count: number; totalMarketCap: number }[];
    marketSummary: {
      totalMarketCap: number;
      totalMarketCapFormatted: string;
      totalCount: number;
      gainersCount: number;
      losersCount: number;
      avgPe: number;
      avgDividendYield: number;
    };
  }> {
    await this.ensureDatabaseSeeded();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(10, params.limit || 50));
    const offset = (page - 1) * limit;

    try {
      // Build filters
      const conditions = [];
      if (params.search) {
        const term = `%${params.search.trim()}%`;
        conditions.push(or(
          ilike(usStocks.ticker, term),
          ilike(usStocks.companyName, term),
          ilike(usStocks.sector, term),
          ilike(usStocks.industry, term)
        ));
      }

      if (params.sector && params.sector !== 'ALL' && params.sector !== 'Tümü') {
        conditions.push(eq(usStocks.sector, params.sector));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Sorting
      let orderByCol: any = desc(usStocks.marketCap);
      const isAsc = params.order === 'asc';

      switch (params.sort) {
        case 'ticker':
          orderByCol = isAsc ? asc(usStocks.ticker) : desc(usStocks.ticker);
          break;
        case 'companyName':
          orderByCol = isAsc ? asc(usStocks.companyName) : desc(usStocks.companyName);
          break;
        case 'price':
          orderByCol = isAsc ? asc(usStocks.price) : desc(usStocks.price);
          break;
        case 'changePct':
          orderByCol = isAsc ? asc(usStocks.changePct) : desc(usStocks.changePct);
          break;
        case 'marketCap':
          orderByCol = isAsc ? asc(usStocks.marketCap) : desc(usStocks.marketCap);
          break;
        case 'volume':
          orderByCol = isAsc ? asc(usStocks.volume) : desc(usStocks.volume);
          break;
        case 'peRatio':
          orderByCol = isAsc ? asc(usStocks.peRatio) : desc(usStocks.peRatio);
          break;
        case 'dividendYield':
          orderByCol = isAsc ? asc(usStocks.dividendYield) : desc(usStocks.dividendYield);
          break;
        case 'targetPrice':
          orderByCol = isAsc ? asc(usStocks.targetPrice) : desc(usStocks.targetPrice);
          break;
        case 'rank':
          orderByCol = isAsc ? asc(usStocks.rank) : desc(usStocks.rank);
          break;
        default:
          orderByCol = desc(usStocks.marketCap);
      }

      // Count total matching
      const countRes = await db
        .select({ count: sql`count(*)` })
        .from(usStocks)
        .where(whereClause);
      const total = Number(countRes[0]?.count || 0);

      // Query page
      const rows = await db
        .select()
        .from(usStocks)
        .where(whereClause)
        .orderBy(orderByCol)
        .limit(limit)
        .offset(offset);

      const stocks: UsStockItem[] = rows.map((r: any, idx) => ({
        id: r.id,
        ticker: r.ticker,
        companyName: r.companyName,
        sector: r.sector || 'Teknoloji',
        industry: r.industry || 'Genel Sanayi',
        exchange: (r.exchange as any) || 'NASDAQ',
        rank: r.rank || offset + idx + 1,
        price: Number(r.price) || 0,
        changePct: Number(r.changePct) || 0,
        change: Number(r.change) || 0,
        marketCap: Number(r.marketCap) || 0,
        marketCapFormatted: r.marketCapFormatted || this.formatMarketCap(Number(r.marketCap)),
        volume: Number(r.volume) || 0,
        avgVolume: Number(r.avgVolume) || 0,
        peRatio: Number(r.peRatio) || 0,
        forwardPe: Number(r.forwardPe) || 0,
        pegRatio: Number(r.pegRatio) || 0,
        priceToBook: Number(r.priceToBook) || 0,
        priceToSales: Number(r.priceToSales) || 0,
        enterpriseValue: Number(r.enterpriseValue) || 0,
        dividendYield: Number(r.dividendYield) || 0,
        dividendDate: r.dividendDate,
        eps: Number(r.eps) || 0,
        forwardEps: Number(r.forwardEps) || 0,
        beta: Number(r.beta) || 1.0,
        fiftyTwoWeekHigh: Number(r.fiftyTwoWeekHigh) || 0,
        fiftyTwoWeekLow: Number(r.fiftyTwoWeekLow) || 0,
        fiftyDayAverage: Number(r.fiftyDayAverage) || 0,
        twoHundredDayAverage: Number(r.twoHundredDayAverage) || 0,
        targetPrice: Number(r.targetPrice) || 0,
        recommendation: r.recommendation || 'Buy',
        analystRating: Number(r.analystRating) || 2.0,
        revenue: Number(r.revenue) || 0,
        netIncome: Number(r.netIncome) || 0,
        profitMargin: Number(r.profitMargin) || 0,
        operatingMargin: Number(r.operatingMargin) || 0,
        returnOnEquity: Number(r.returnOnEquity) || 0,
        returnOnAssets: Number(r.returnOnAssets) || 0,
        debtToEquity: Number(r.debtToEquity) || 0,
        freeCashFlow: Number(r.freeCashFlow) || 0,
        shortRatio: Number(r.shortRatio) || 0,
        sharesOutstanding: Number(r.sharesOutstanding) || 0,
        country: r.country || 'United States',
        city: r.city,
        state: r.state,
        website: r.website,
        ceo: r.ceo,
        fullTimeEmployees: r.fullTimeEmployees,
        description: r.description,
        lastUpdated: r.lastUpdated
      }));

      // Aggregates
      const allStocksAgg = await db.select({
        totalCap: sql`sum(market_cap)`,
        count: sql`count(*)`,
        gainers: sql`count(*) filter (where change_pct > 0)`,
        losers: sql`count(*) filter (where change_pct < 0)`,
        avgPe: sql`avg(pe_ratio) filter (where pe_ratio > 0 and pe_ratio < 200)`,
        avgDiv: sql`avg(dividend_yield)`
      }).from(usStocks);

      const agg: any = allStocksAgg[0] || {};
      const totalMarketCap = Number(agg.totalCap || 48500000000000);

      // Sector statistics
      const sectorRows = await db.select({
        sector: usStocks.sector,
        count: sql`count(*)`,
        cap: sql`sum(market_cap)`
      }).from(usStocks).groupBy(usStocks.sector);

      const sectorStats = sectorRows.map((s: any) => ({
        sector: s.sector || 'Diğer',
        count: Number(s.count || 0),
        totalMarketCap: Number(s.cap || 0)
      })).sort((a, b) => b.totalMarketCap - a.totalMarketCap);

      return {
        stocks,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        sectorStats,
        marketSummary: {
          totalMarketCap,
          totalMarketCapFormatted: this.formatMarketCap(totalMarketCap),
          totalCount: Number(agg.count || 0),
          gainersCount: Number(agg.gainers || 0),
          losersCount: Number(agg.losers || 0),
          avgPe: Number(Number(agg.avgPe || 0).toFixed(2)),
          avgDividendYield: Number(Number(agg.avgDiv || 0).toFixed(2))
        }
      };
    } catch (err: any) {
      console.error('[US Universe] getStocks error:', err.message);
      // Removed seed fallback, return empty on error
      return {
        stocks: [],
        total: 0,
        page,
        totalPages: 1,
        sectorStats: [],
        marketSummary: {
          totalMarketCap: 0,
          totalMarketCapFormatted: '$0',
          totalCount: 0,
          gainersCount: 0,
          losersCount: 0,
          avgPe: 0,
          avgDividendYield: 0
        }
      };
    }
  }

  /**
   * Get single US Stock with full deep details
   */
  async getStockByTicker(ticker: string): Promise<UsStockItem | null> {
    const symbol = ticker.toUpperCase().trim();
    try {
      const rows = await db.select().from(usStocks).where(eq(usStocks.ticker, symbol)).limit(1);
      if (rows.length > 0) {
        const r: any = rows[0];
        return {
          id: r.id,
          ticker: r.ticker,
          companyName: r.companyName,
          sector: r.sector || 'Teknoloji',
          industry: r.industry || 'Genel',
          exchange: (r.exchange as any) || 'NASDAQ',
          rank: r.rank || 1,
          price: Number(r.price) || 0,
          changePct: Number(r.changePct) || 0,
          change: Number(r.change) || 0,
          marketCap: Number(r.marketCap) || 0,
          marketCapFormatted: r.marketCapFormatted || this.formatMarketCap(Number(r.marketCap)),
          volume: Number(r.volume) || 0,
          avgVolume: Number(r.avgVolume) || 0,
          peRatio: Number(r.peRatio) || 0,
          forwardPe: Number(r.forwardPe) || 0,
          pegRatio: Number(r.pegRatio) || 0,
          priceToBook: Number(r.priceToBook) || 0,
          priceToSales: Number(r.priceToSales) || 0,
          enterpriseValue: Number(r.enterpriseValue) || 0,
          dividendYield: Number(r.dividendYield) || 0,
          dividendDate: r.dividendDate,
          eps: Number(r.eps) || 0,
          forwardEps: Number(r.forwardEps) || 0,
          beta: Number(r.beta) || 1.0,
          fiftyTwoWeekHigh: Number(r.fiftyTwoWeekHigh) || 0,
          fiftyTwoWeekLow: Number(r.fiftyTwoWeekLow) || 0,
          fiftyDayAverage: Number(r.fiftyDayAverage) || 0,
          twoHundredDayAverage: Number(r.twoHundredDayAverage) || 0,
          targetPrice: Number(r.targetPrice) || 0,
          recommendation: r.recommendation || 'Buy',
          analystRating: Number(r.analystRating) || 2.0,
          revenue: Number(r.revenue) || 0,
          netIncome: Number(r.netIncome) || 0,
          profitMargin: Number(r.profitMargin) || 0,
          operatingMargin: Number(r.operatingMargin) || 0,
          returnOnEquity: Number(r.returnOnEquity) || 0,
          returnOnAssets: Number(r.returnOnAssets) || 0,
          debtToEquity: Number(r.debtToEquity) || 0,
          freeCashFlow: Number(r.freeCashFlow) || 0,
          shortRatio: Number(r.shortRatio) || 0,
          sharesOutstanding: Number(r.sharesOutstanding) || 0,
          country: r.country || 'United States',
          city: r.city,
          state: r.state,
          website: r.website,
          ceo: r.ceo,
          fullTimeEmployees: r.fullTimeEmployees,
          description: r.description,
          lastUpdated: r.lastUpdated
        };
      }
    } catch (e) {
      console.warn('DB lookup failed for ticker:', symbol, e);
    }

    const fallback = TOP_1000_US_COMPANIES_SEED.find(s => s.ticker === symbol);
    if (fallback) {
      return {
        ...fallback,
        marketCapFormatted: this.formatMarketCap(fallback.marketCap)
      } as any;
    }
    return null;
  }

  /**
   * Synchronize real-time quotes for Top 1000 US companies via Yahoo Finance in chunks
   */
  async syncAll1000Quotes(): Promise<{ total: number; updated: number }> {
    if (this.progress.isSyncing) {
      return { total: this.progress.totalStocks, updated: this.progress.syncedCount };
    }

    this.progress = {
      isSyncing: true,
      phase: 'SYNCING_QUOTES',
      totalStocks: 1000,
      syncedCount: 0,
      currentTicker: '',
    };

    const startTime = new Date();
    let updatedCount = 0;

    try {
      const allTickers = TOP_1000_US_COMPANIES_SEED.map(s => s.ticker);
      const CHUNK_SIZE = 40;

      for (let i = 0; i < allTickers.length; i += CHUNK_SIZE) {
        const chunk = allTickers.slice(i, i + CHUNK_SIZE);
        this.progress.currentTicker = chunk[0];
        
        try {
          const quotes = await yf.quote(chunk);
          for (const q of quotes) {
            if (!q || !q.symbol) continue;
            const price = q.regularMarketPrice || q.currentPrice;
            if (!price) continue;

            const changePct = q.regularMarketChangePercent || 0;
            const change = q.regularMarketChange || 0;
            const marketCap = q.marketCap || 0;
            const volume = q.regularMarketVolume || 0;
            const pe = q.trailingPE || q.forwardPE;
            const high52 = q.fiftyTwoWeekHigh;
            const low52 = q.fiftyTwoWeekLow;

            await db.update(usStocks)
              .set({
                price: String(price),
                changePct: String(changePct),
                change: String(change),
                ...(marketCap ? { marketCap: String(marketCap), marketCapFormatted: this.formatMarketCap(marketCap) } : {}),
                ...(volume ? { volume: String(volume) } : {}),
                ...(pe ? { peRatio: String(pe) } : {}),
                ...(high52 ? { fiftyTwoWeekHigh: String(high52) } : {}),
                ...(low52 ? { fiftyTwoWeekLow: String(low52) } : {}),
                lastUpdated: new Date()
              })
              .where(eq(usStocks.ticker, q.symbol));

            updatedCount++;
          }
        } catch (chunkErr: any) {
          console.warn(`[US Universe] Chunk error for ${chunk.slice(0, 3).join(',')}:`, chunkErr.message);
        }

        this.progress.syncedCount = Math.min(1000, i + CHUNK_SIZE);
        await new Promise(r => setTimeout(r, 150));
      }

      this.progress.phase = 'COMPLETED';
      this.progress.isSyncing = false;
      this.progress.lastSyncTime = new Date().toISOString();

      await db.insert(syncLogs).values({
        source: 'US_EQUITIES_1000',
        status: 'SUCCESS',
        recordsProcessed: updatedCount,
        message: `Amerikan Borsaları (NYSE & NASDAQ) Top 1.000 şirket canlı fiyatları ve değerleme çarpanları başarıyla senkronize edildi.`,
        startedAt: startTime,
        completedAt: new Date()
      });

      appEventBus.emitOfficeEvent({
        type: 'US_STOCKS_SYNCED',
        actor: 'YAHOO_ADAPTER',
        department: 'BORSA',
        status: 'SUCCESS',
        detail: `Amerikan Borsaları (Top 1.000 Şirket) ${updatedCount} hisse başarıyla güncellendi.`,
        payload: { count: updatedCount }
      });
      return { total: 1000, updated: updatedCount };
    } catch (err: any) {
      this.progress.isSyncing = false;
      this.progress.phase = 'ERROR';
      this.progress.lastError = err.message;

      await db.insert(syncLogs).values({
        source: 'US_EQUITIES_1000',
        status: 'ERROR',
        recordsProcessed: updatedCount,
        message: `US Equities sync hatası: ${err.message}`,
        startedAt: startTime,
        completedAt: new Date()
      });

      return { total: 1000, updated: updatedCount };
    }
  }

  async syncUsQuotes(): Promise<{ total: number; updated: number }> {
    return this.syncAll1000Quotes();
  }
}

export const usUniverseService = new UsUniverseService();
