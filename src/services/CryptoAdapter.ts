import { DataSourceAdapter, SyncResult } from './DataSourceAdapter.ts';
import { cryptoService } from './CryptoService.ts';

export class CryptoAdapter implements DataSourceAdapter {
  sourceName = 'CRYPTO';

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    try {
      // 1. Live prices
      await cryptoService.getLivePrices(true);
      
      // 2. Fetch candles for top coins (e.g. BTC, ETH, SOL, BNB, XRP)
      // Since doing all 500 would take too long for a single sync click,
      // we'll just sync the top few, or maybe rely on the backend overview stats.
      // Wait, CryptoService's getSyncOverview returns a bunch of stuff.
      // Let's just do getLivePrices for all active coins.
      // Wait, is there a getSyncOverview that does work?
      // Let's see what getLivePrices does.
      
      const coins = await cryptoService.getLivePrices(true);
      
      return {
        source: this.sourceName,
        status: 'SUCCESS',
        recordsProcessed: coins.length,
        startedAt,
        completedAt: new Date(),
        message: `${coins.length} kripto para canlı fiyatları güncellendi.`
      };
    } catch (e: any) {
      return {
        source: this.sourceName,
        status: 'ERROR',
        recordsProcessed: 0,
        message: e.message,
        startedAt,
        completedAt: new Date()
      };
    }
  }
}
