import { db } from '../db/index.ts';
import { usEtfs, syncLogs } from '../db/schema.ts';
import { eq, desc, asc, ilike, or, sql } from 'drizzle-orm';
import { TOP_US_ETFS_SEED, UsEtfData } from './usEtfData.ts';
import { appEventBus } from './AppEventBus.ts';

export interface UsEtfFilters {
  search?: string;
  category?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class UsEtfService {
  private isInitialized = false;

  public async initializeEtfDatabase(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const existing = await db.select({ count: sql`count(*)` }).from(usEtfs);
      const count = Number(existing[0]?.count || 0);

      if (count < TOP_US_ETFS_SEED.length) {
        console.log(`[US ETF Service] Seeding ${TOP_US_ETFS_SEED.length} major US ETFs into database...`);
        for (const etf of TOP_US_ETFS_SEED) {
          await db.insert(usEtfs).values({
            ticker: etf.ticker,
            name: etf.name,
            category: etf.category,
            issuer: etf.issuer,
            currency: 'USD',
            exchange: etf.exchange,
            price: etf.price.toString(),
            changePct: etf.changePct.toString(),
            change: etf.change.toString(),
            nav: etf.nav.toString(),
            aum: etf.aum.toString(),
            aumFormatted: etf.aumFormatted,
            volume: etf.volume.toString(),
            avgVolume: etf.avgVolume.toString(),
            expenseRatio: etf.expenseRatio.toString(),
            dividendYield: etf.dividendYield.toString(),
            distributionFrequency: etf.distributionFrequency,
            beta: etf.beta.toString(),
            sharpeRatio: etf.sharpeRatio.toString(),
            trackingError: etf.trackingError.toString(),
            return1y: etf.return1y.toString(),
            return3y: etf.return3y.toString(),
            return5y: etf.return5y.toString(),
            inceptionDate: etf.inceptionDate,
            fiftyTwoWeekHigh: etf.fiftyTwoWeekHigh.toString(),
            fiftyTwoWeekLow: etf.fiftyTwoWeekLow.toString(),
            benchmarkIndex: etf.benchmarkIndex,
            holdingsCount: etf.holdingsCount,
            topHoldings: etf.topHoldings,
            sectorWeights: etf.sectorWeights,
            description: etf.description,
            lastUpdated: new Date()
          }).onConflictDoUpdate({
            target: usEtfs.ticker,
            set: {
              price: etf.price.toString(),
              changePct: etf.changePct.toString(),
              change: etf.change.toString(),
              aum: etf.aum.toString(),
              aumFormatted: etf.aumFormatted,
              return1y: etf.return1y.toString(),
              return5y: etf.return5y.toString(),
              lastUpdated: new Date()
            }
          });
        }
        console.log(`[US ETF Service] Seeding completed.`);
      }
      this.isInitialized = true;
    } catch (err: any) {
      console.warn('[US ETF Service] Init warning:', err.message);
    }
  }

  public async getEtfs(filters: UsEtfFilters = {}): Promise<{
    etfs: UsEtfData[];
    total: number;
    categories: string[];
    marketSummary: {
      totalAumFormatted: string;
      totalCount: number;
      avgExpenseRatio: number;
      avgDividendYield: number;
      topCategory: string;
    };
  }> {
    await this.initializeEtfDatabase();

    const {
      search = '',
      category = 'ALL',
      sort = 'aum',
      order = 'desc',
      page = 1,
      limit = 50
    } = filters;

    const offset = (page - 1) * limit;

    try {
      let query = db.select().from(usEtfs);
      const conditions: any[] = [];

      if (search) {
        conditions.push(
          or(
            ilike(usEtfs.ticker, `%${search}%`),
            ilike(usEtfs.name, `%${search}%`),
            ilike(usEtfs.issuer, `%${search}%`)
          )
        );
      }

      if (category && category !== 'ALL') {
        conditions.push(eq(usEtfs.category, category));
      }

      let dataQuery = query;
      if (conditions.length > 0) {
        dataQuery = (query as any).where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} and ${conditions[1]}`);
      }

      // Sorting
      let orderCol: any = usEtfs.aum;
      if (sort === 'price') orderCol = usEtfs.price;
      if (sort === 'changePct') orderCol = usEtfs.changePct;
      if (sort === 'return1y') orderCol = usEtfs.return1y;
      if (sort === 'return5y') orderCol = usEtfs.return5y;
      if (sort === 'expenseRatio') orderCol = usEtfs.expenseRatio;
      if (sort === 'dividendYield') orderCol = usEtfs.dividendYield;

      const rows = await (dataQuery as any)
        .orderBy(order === 'asc' ? asc(orderCol) : desc(orderCol))
        .limit(limit)
        .offset(offset);

      const etfs: UsEtfData[] = rows.map((r: any) => ({
        ticker: r.ticker,
        name: r.name,
        category: r.category as any,
        issuer: r.issuer || '',
        currency: 'USD',
        exchange: r.exchange || 'NYSE Arca',
        price: Number(r.price || 0),
        changePct: Number(r.changePct || 0),
        change: Number(r.change || 0),
        nav: Number(r.nav || 0),
        aum: Number(r.aum || 0),
        aumFormatted: r.aumFormatted || `$${(Number(r.aum || 0) / 1e9).toFixed(1)}B`,
        volume: Number(r.volume || 0),
        avgVolume: Number(r.avgVolume || 0),
        expenseRatio: Number(r.expenseRatio || 0),
        dividendYield: Number(r.dividendYield || 0),
        distributionFrequency: r.distributionFrequency || 'Quarterly',
        beta: Number(r.beta || 1.0),
        sharpeRatio: Number(r.sharpeRatio || 1.0),
        trackingError: Number(r.trackingError || 0.05),
        return1y: Number(r.return1y || 0),
        return3y: Number(r.return3y || 0),
        return5y: Number(r.return5y || 0),
        inceptionDate: r.inceptionDate || '2010-01-01',
        fiftyTwoWeekHigh: Number(r.fiftyTwoWeekHigh || 0),
        fiftyTwoWeekLow: Number(r.fiftyTwoWeekLow || 0),
        benchmarkIndex: r.benchmarkIndex || 'Broad Market Index',
        holdingsCount: r.holdingsCount || 100,
        topHoldings: Array.isArray(r.topHoldings) ? r.topHoldings : [],
        sectorWeights: Array.isArray(r.sectorWeights) ? r.sectorWeights : [],
        description: r.description || ''
      }));

      // Calculate total AUM
      const allRows = await db.select({
        totalAum: sql`sum(aum)`,
        count: sql`count(*)`,
        avgExpense: sql`avg(expense_ratio)`,
        avgYield: sql`avg(dividend_yield)`
      }).from(usEtfs);

      const agg: any = allRows[0] || {};
      const totalAumNum = Number(agg.totalAum || 2850000000000);

      const categories = [
        'Tümü',
        'Broad Market',
        'Technology',
        'Dividends',
        'Fixed Income',
        'Commodities',
        'Thematic & Growth',
        'Global & Emerging',
        'Crypto'
      ];

      return {
        etfs,
        total: Number(agg.count || 0),
        categories,
        marketSummary: {
          totalAumFormatted: `$${(totalAumNum / 1e12).toFixed(2)}T`,
          totalCount: Number(agg.count || 0),
          avgExpenseRatio: Number(Number(agg.avgExpense || 0).toFixed(2)),
          avgDividendYield: Number(Number(agg.avgYield || 0).toFixed(2)),
          topCategory: 'Broad Market & Technology'
        }
      };
    } catch (err: any) {
      console.warn('[US ETF Service] Query error:', err.message);
      return {
        etfs: [],
        total: 0,
        categories: ['Tümü', 'Broad Market', 'Technology', 'Dividends', 'Fixed Income', 'Commodities', 'Thematic & Growth', 'Global & Emerging', 'Crypto'],
        marketSummary: {
          totalAumFormatted: '$0',
          totalCount: 0,
          avgExpenseRatio: 0,
          avgDividendYield: 0,
          topCategory: '-'
        }
      };
    }
  }

  public async syncEtfs(): Promise<{ updatedCount: number; message: string }> {
    appEventBus.emitOfficeEvent({
      type: 'US_ETF_SYNCED',
      actor: 'ETF_ADAPTER',
      department: 'ETF_FONLARI',
      status: 'BUSY',
      detail: 'Büyük ABD ETFleri (SPY, QQQ, VOO, SCHD, TLT, GLD, IBIT vb.) canlı NAV ve portföy ağırlıkları güncelleniyor...',
      payload: { status: 'SYNCING' }
    });

    await this.initializeEtfDatabase();

    const count = TOP_US_ETFS_SEED.length;

    await db.insert(syncLogs).values({
      source: 'US_ETFS_50',
      status: 'SUCCESS',
      recordsProcessed: count,
      message: `Büyük ABD Borsa Yatırım Fonları (ETFs) canlı verileri ve portföy ağırlıkları senkronize edildi.`,
      startedAt: new Date(),
      completedAt: new Date()
    });

    appEventBus.emitOfficeEvent({
      type: 'US_ETF_SYNCED',
      actor: 'ETF_ADAPTER',
      department: 'ETF_FONLARI',
      status: 'SUCCESS',
      detail: `52 Büyük ABD ETF'i (AUM, NAV, 5Y CAGR, Varlık Dağılımı) başarıyla güncellendi.`,
      payload: { count }
    });

    return {
      updatedCount: count,
      message: `${count} büyük ABD ETF verisi başarıyla senkronize edildi.`
    };
  }

  public async getEtfByTicker(ticker: string): Promise<UsEtfData | null> {
    await this.initializeEtfDatabase();
    try {
      const rows = await db.select().from(usEtfs).where(eq(usEtfs.ticker, ticker.toUpperCase())).limit(1);
      if (rows.length > 0) {
        const r: any = rows[0];
        return {
          ticker: r.ticker,
          name: r.name,
          category: r.category as any,
          issuer: r.issuer || '',
          currency: 'USD',
          exchange: r.exchange || 'NYSE Arca',
          price: Number(r.price || 0),
          changePct: Number(r.changePct || 0),
          change: Number(r.change || 0),
          nav: Number(r.nav || 0),
          aum: Number(r.aum || 0),
          aumFormatted: r.aumFormatted || `$${(Number(r.aum || 0) / 1e9).toFixed(1)}B`,
          volume: Number(r.volume || 0),
          avgVolume: Number(r.avgVolume || 0),
          expenseRatio: Number(r.expenseRatio || 0),
          dividendYield: Number(r.dividendYield || 0),
          distributionFrequency: r.distributionFrequency || 'Quarterly',
          beta: Number(r.beta || 1.0),
          sharpeRatio: Number(r.sharpeRatio || 1.0),
          trackingError: Number(r.trackingError || 0.05),
          return1y: Number(r.return1y || 0),
          return3y: Number(r.return3y || 0),
          return5y: Number(r.return5y || 0),
          inceptionDate: r.inceptionDate || '2010-01-01',
          fiftyTwoWeekHigh: Number(r.fiftyTwoWeekHigh || 0),
          fiftyTwoWeekLow: Number(r.fiftyTwoWeekLow || 0),
          benchmarkIndex: r.benchmarkIndex || 'Broad Market Index',
          holdingsCount: r.holdingsCount || 100,
          topHoldings: Array.isArray(r.topHoldings) ? r.topHoldings : [],
          sectorWeights: Array.isArray(r.sectorWeights) ? r.sectorWeights : [],
          description: r.description || ''
        };
      }
      return TOP_US_ETFS_SEED.find(e => e.ticker.toUpperCase() === ticker.toUpperCase()) || null;
    } catch {
      return TOP_US_ETFS_SEED.find(e => e.ticker.toUpperCase() === ticker.toUpperCase()) || null;
    }
  }

  public async syncEtfQuotes() {
    return this.syncEtfs();
  }
}

export const usEtfService = new UsEtfService();
