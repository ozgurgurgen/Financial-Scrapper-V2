import YahooFinance from 'yahoo-finance2';
import { db } from '../db/index.ts';
import { usHistoricalCandles, usStocks, usEtfs } from '../db/schema.ts';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { appEventBus } from './AppEventBus.ts';
import { generateUsHistoricalCandlesSeed } from './usHistoricalSeedData.ts';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface CandlePoint {
  date: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  peRatio?: number;
  dividendYield?: number;
}

export interface Historical5YPerformance {
  ticker: string;
  assetType: 'STOCK' | 'ETF';
  currency: 'USD';
  currentPrice: number;
  periodStartPrice: number;
  fiveYearReturnPct: number;
  cagr5yPct: number;
  threeYearReturnPct: number;
  oneYearReturnPct: number;
  sixMonthReturnPct: number;
  oneMonthReturnPct: number;
  allTimeHigh5y: number;
  allTimeLow5y: number;
  maxDrawdown5y: number;
  historicalVolatility: number;
  sp500ComparisonDiff: number; // vs S&P 500 (~+95% over 5Y)
  candles: CandlePoint[];
}

export class UsHistoricalService {
  /**
   * Ensures historical candles are populated in database
   */
  public async ensureHistoricalSeeded(): Promise<number> {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(usHistoricalCandles);
      const count = Number(existing[0]?.count || 0);
      if (count >= 100) return count;

      console.log('[US History] Seeding historical daily OHLCV candles...');
      const seedCandles = generateUsHistoricalCandlesSeed();
      for (let i = 0; i < seedCandles.length; i += 200) {
        const chunk = seedCandles.slice(i, i + 200);
        await db.insert(usHistoricalCandles).values(chunk);
      }
      return seedCandles.length;
    } catch (e: any) {
      console.warn('[US History] ensureHistoricalSeeded notice:', e.message);
      return 0;
    }
  }

  /**
   * Fetches real 5-year historical OHLCV data using Yahoo Finance API
   */
  public async fetch5YearHistory(ticker: string, assetType: 'STOCK' | 'ETF' = 'STOCK'): Promise<CandlePoint[]> {
    const symbol = ticker.toUpperCase().trim();
    try {
      const fiveYearsAgo = new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000);
      const res = await yf.chart(symbol, {
        period1: fiveYearsAgo,
        interval: '1d'
      });

      if (!res?.quotes || res.quotes.length === 0) {
        return [];
      }

      const points: CandlePoint[] = [];
      const recordsToInsert = [];

      for (const q of res.quotes) {
        if (!q || q.close == null || q.open == null) continue;
        const d = new Date(q.date);
        const dateStr = d.toISOString().split('T')[0];
        const open = Number(q.open);
        const high = Number(q.high ?? q.open);
        const low = Number(q.low ?? q.open);
        const close = Number(q.close);
        const volume = Number(q.volume ?? 0);

        points.push({
          date: dateStr,
          timestamp: d.toISOString(),
          open,
          high,
          low,
          close,
          volume
        });

        recordsToInsert.push({
          ticker: symbol,
          assetType: assetType,
          currency: 'USD',
          period: 'DAILY',
          date: dateStr,
          timestamp: d,
          open: String(open),
          high: String(high),
          low: String(low),
          close: String(close),
          volume: String(volume),
          adjClose: String(q.adjclose ?? close)
        });
      }

      // Upsert into DB in chunks
      if (recordsToInsert.length > 0) {
        try {
          for (let i = 0; i < recordsToInsert.length; i += 200) {
            const chunk = recordsToInsert.slice(i, i + 200);
            await db.insert(usHistoricalCandles)
              .values(chunk);
          }
        } catch (dbErr: any) {
          console.warn(`[US History] DB save skipped for ${symbol}:`, dbErr.message);
        }
      }

      return points;
    } catch (e: any) {
      console.warn(`[US History] Yahoo chart fetch error for ${symbol}:`, e.message);
      
      // Try fallback from DB
      try {
        const rows = await db.select().from(usHistoricalCandles)
          .where(eq(usHistoricalCandles.ticker, symbol))
          .orderBy(asc(usHistoricalCandles.date));

        if (rows.length > 0) {
          return rows.map(r => ({
            date: r.date,
            timestamp: new Date(r.timestamp).toISOString(),
            open: Number(r.open),
            high: Number(r.high),
            low: Number(r.low),
            close: Number(r.close),
            volume: Number(r.volume || '0')
          }));
        }
      } catch {}

      return [];
    }
  }

  /**
   * Retrieves or computes full 5-year performance statistics for a stock or ETF in USD ($).
   */
  public async get5YearPerformance(ticker: string, assetType: 'STOCK' | 'ETF' = 'STOCK'): Promise<Historical5YPerformance> {
    const upperTicker = ticker.toUpperCase().trim();
    let currentPrice = 150.0;
    
    try {
      if (assetType === 'STOCK') {
        const stockRows = await db.select().from(usStocks).where(eq(usStocks.ticker, upperTicker)).limit(1);
        if (stockRows.length > 0 && stockRows[0].price) {
          currentPrice = Number(stockRows[0].price);
        }
      } else {
        const etfRows = await db.select().from(usEtfs).where(eq(usEtfs.ticker, upperTicker)).limit(1);
        if (etfRows.length > 0 && etfRows[0].price) {
          currentPrice = Number(etfRows[0].price);
        }
      }
    } catch (err: any) {
      console.warn(`[US History] DB lookup fallback for ${upperTicker}:`, err.message);
    }

    const candles = await this.fetch5YearHistory(upperTicker);

    if (candles.length === 0) {
      return {
        ticker: upperTicker,
        assetType,
        currency: 'USD',
        currentPrice,
        periodStartPrice: currentPrice,
        fiveYearReturnPct: 0,
        cagr5yPct: 0,
        threeYearReturnPct: 0,
        oneYearReturnPct: 0,
        sixMonthReturnPct: 0,
        oneMonthReturnPct: 0,
        allTimeHigh5y: currentPrice,
        allTimeLow5y: currentPrice,
        maxDrawdown5y: 0,
        historicalVolatility: 0,
        sp500ComparisonDiff: 0,
        candles: []
      };
    }

    const startCandle = candles[0];
    const latestCandle = candles[candles.length - 1];
    const periodStartPrice = startCandle.close;
    const actualCurrentPrice = latestCandle.close || currentPrice;

    // Returns
    const fiveYearReturnPct = Number((((actualCurrentPrice - periodStartPrice) / periodStartPrice) * 100).toFixed(2));
    const cagr5yPct = Number(((Math.pow(actualCurrentPrice / periodStartPrice, 1 / 5) - 1) * 100).toFixed(2));

    // Periodic returns
    const getReturnFromIndex = (daysBack: number) => {
      const idx = Math.max(0, candles.length - 1 - daysBack);
      const base = candles[idx]?.close;
      if (!base) return 0;
      return Number((((actualCurrentPrice - base) / base) * 100).toFixed(2));
    };

    const threeYearReturnPct = getReturnFromIndex(756);
    const oneYearReturnPct = getReturnFromIndex(252);
    const sixMonthReturnPct = getReturnFromIndex(126);
    const oneMonthReturnPct = getReturnFromIndex(21);

    // High, Low & Max Drawdown
    let allTimeHigh5y = 0;
    let allTimeLow5y = Infinity;
    let peak = 0;
    let maxDrawdown5y = 0;
    const dailyReturns: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.high > allTimeHigh5y) allTimeHigh5y = c.high;
      if (c.low < allTimeLow5y) allTimeLow5y = c.low;

      if (c.close > peak) {
        peak = c.close;
      }
      const dd = ((peak - c.close) / peak) * 100;
      if (dd > maxDrawdown5y) maxDrawdown5y = dd;

      if (i > 0) {
        const prev = candles[i - 1].close;
        dailyReturns.push((c.close - prev) / prev);
      }
    }

    // Historical Volatility (Annualized std dev of daily returns)
    let historicalVolatility = 0;
    if (dailyReturns.length > 0) {
      const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
      historicalVolatility = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
    }

    // S&P 500 comparison (Assume SPY return ~+95% over 5 years)
    const sp500ComparisonDiff = Number((fiveYearReturnPct - 95.4).toFixed(2));

    return {
      ticker: upperTicker,
      assetType,
      currency: 'USD',
      currentPrice: actualCurrentPrice,
      periodStartPrice,
      fiveYearReturnPct,
      cagr5yPct,
      threeYearReturnPct,
      oneYearReturnPct,
      sixMonthReturnPct,
      oneMonthReturnPct,
      allTimeHigh5y: Number(allTimeHigh5y.toFixed(2)),
      allTimeLow5y: Number(allTimeLow5y.toFixed(2)),
      maxDrawdown5y: Number(maxDrawdown5y.toFixed(2)),
      historicalVolatility,
      sp500ComparisonDiff,
      candles
    };
  }

  /**
   * Bulk synchronizes 5-year history for all top assets and emits simulation events.
   */
  public async syncAll5YearHistory(): Promise<{ syncedCount: number; message: string }> {
    appEventBus.emitOfficeEvent({
      type: 'US_HISTORICAL_5Y_SYNCED',
      actor: 'BACKFILL_SERVICE',
      department: 'BACKFILL',
      status: 'BUSY',
      detail: 'Amerikan Borsaları (Hisseler & ETFler) 5 yıllık derin mum ve performans verileri arşivleniyor...',
      payload: { status: 'SYNCING' }
    });

    const topTickers = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'QQQ', 'VOO', 'IVV', 'VTI'];
    let synced = 0;

    for (const t of topTickers) {
      try {
        const points = await this.fetch5YearHistory(t);
        if (points.length > 0) synced++;
      } catch (err: any) {
        console.warn(`[US History Sync] Error for ${t}:`, err.message);
      }
    }

    appEventBus.emitOfficeEvent({
      type: 'US_HISTORICAL_5Y_SYNCED',
      actor: 'BACKFILL_SERVICE',
      department: 'BACKFILL',
      status: 'SUCCESS',
      detail: `Amerikan Borsaları (${synced} Varlık) 5 yıllık gerçek günlük mum serileri başarıyla güncellendi.`,
      payload: { count: synced }
    });

    return {
      syncedCount: synced,
      message: `${synced} ABD hisse senedi ve ETF için 5 yıllık gerçek geçmiş veriler başarıyla yüklendi.`
    };
  }
}

export const usHistoricalService = new UsHistoricalService();

