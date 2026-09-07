import { DataSourceAdapter, SyncResult } from './DataSourceAdapter.ts';
import { syncManager } from './SyncManager.ts';
import YahooFinance from 'yahoo-finance2';

const yahoo = new YahooFinance();

const BIST_TICKERS = [
  'XU100.IS', 'THYAO.IS', 'BIMAS.IS', 'KCHOL.IS', 'FROTO.IS', 'SISE.IS',
  'TUPRS.IS', 'AKBNK.IS', 'ISCTR.IS', 'SAHOL.IS', 'EREGL.IS', 'ASELS.IS', 'GARAN.IS'
];

export class YahooAdapter implements DataSourceAdapter {
  sourceName = 'YAHOO';

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    let recordsProcessed = 0;
    
    try {
      // 1. Son Anlık Fiyatlar
      const quotes = await yahoo.quote(BIST_TICKERS) as any[];
      
      for (const q of quotes) {
        if (!q.symbol) continue;
        
        const cleanTicker = q.symbol.replace('.IS', '').replace('^', '');
        const datePeriod = new Date().toISOString().split('T')[0];
        
        await syncManager.resolveOrUnmatched(
          this.sourceName,
          q.symbol,
          q.shortName || cleanTicker,
          q.symbol.startsWith('^') || q.symbol.startsWith('XU') ? 'INDEX' : 'STOCK',
          cleanTicker,
          q,
          q.regularMarketPrice || 0,
          datePeriod
        );
        
        recordsProcessed++;
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

  // 5 Yıllık Gerçek Tarihsel Günlük Kapanış Verilerini Çek
  async syncHistorical(years: number = 5): Promise<number> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    let totalProcessed = 0;

    for (const symbol of BIST_TICKERS) {
      try {
        const chart = await yahoo.chart(symbol, {
          period1: startDate,
          interval: '1d'
        });

        const quotes = chart.quotes || [];
        const cleanTicker = symbol.replace('.IS', '').replace('^', '');
        const assetType = symbol.startsWith('^') || symbol.startsWith('XU') ? 'INDEX' : 'STOCK';

        const rows = quotes
          .filter(q => q.close !== null && q.close !== undefined)
          .map(q => {
            const datePeriod = new Date(q.date).toISOString().split('T')[0];
            return {
              normalizedValue: parseFloat(q.close.toFixed(4)),
              datePeriod,
              rawData: {
                date: datePeriod,
                open: q.open,
                high: q.high,
                low: q.low,
                close: q.close,
                volume: q.volume
              }
            };
          });

        const count = await syncManager.resolveAndStoreBatch(
          this.sourceName,
          symbol,
          cleanTicker,
          assetType,
          cleanTicker,
          rows
        );
        totalProcessed += count;
      } catch (err) {
        console.error(`Yahoo historical sync error for ${symbol}:`, err);
      }
    }

    return totalProcessed;
  }
}
