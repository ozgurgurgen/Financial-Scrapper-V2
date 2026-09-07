import { db } from './index.ts';
import { bistStocks } from './schema.ts';
import { desc, eq } from 'drizzle-orm';
import YahooFinance from 'yahoo-finance2';

const yahoo = new YahooFinance();

// Standard BIST 30 or popular stocks for initial seeding
const BIST_TICKERS = [
  'THYAO.IS', 'BIMAS.IS', 'KCHOL.IS', 'FROTO.IS', 'SISE.IS',
  'TUPRS.IS', 'AKBNK.IS', 'ISCTR.IS', 'SAHOL.IS', 'EREGL.IS'
];

export async function fetchAndStoreYahooData() {
  try {
    const quotes = await yahoo.quote(BIST_TICKERS) as any[];
    
    for (const q of quotes) {
      if (!q.symbol) continue;
      
      const cleanTicker = q.symbol.replace('.IS', '');
      
      await db.insert(bistStocks)
        .values({
          ticker: cleanTicker,
          companyName: q.shortName || cleanTicker,
          price: (q.regularMarketPrice || 0).toString(),
          changePct: (q.regularMarketChangePercent || 0).toString(),
          marketCap: (q.marketCap || 0).toString(),
          volume: (q.regularMarketVolume || 0).toString(),
          peRatio: (q.trailingPE || 0).toString(),
          fiftyTwoWeekHigh: (q.fiftyTwoWeekHigh || 0).toString(),
          fiftyTwoWeekLow: (q.fiftyTwoWeekLow || 0).toString(),
          lastUpdated: new Date()
        })
        .onConflictDoUpdate({
          target: bistStocks.ticker,
          set: {
            companyName: q.shortName || cleanTicker,
            price: (q.regularMarketPrice || 0).toString(),
            changePct: (q.regularMarketChangePercent || 0).toString(),
            marketCap: (q.marketCap || 0).toString(),
            volume: (q.regularMarketVolume || 0).toString(),
            peRatio: (q.trailingPE || 0).toString(),
            fiftyTwoWeekHigh: (q.fiftyTwoWeekHigh || 0).toString(),
            fiftyTwoWeekLow: (q.fiftyTwoWeekLow || 0).toString(),
            lastUpdated: new Date()
          }
        });
    }
    
    return { success: true, count: quotes.length };
  } catch (error) {
    console.error("Failed to fetch Yahoo Finance data:", error);
    throw new Error("Yahoo Finance sync failed.", { cause: error });
  }
}

export async function getStocks() {
  try {
    return await db.select().from(bistStocks).orderBy(desc(bistStocks.marketCap));
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
