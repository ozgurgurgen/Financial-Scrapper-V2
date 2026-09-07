import { db } from '../db/index.ts';
import { backfillSyncState, bistStocks, tefasFunds, tefasHistoricalNavs, assetData, cryptoCoins, cryptoCandles } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { bistUniverseService } from './BistUniverseService.ts';
import axios from 'axios';
import { appEventBus } from './AppEventBus.ts';

export interface BackfillStatus {
  taskName: string;
  totalItems: number;
  completedItems: number;
  progressPct: number;
  currentItem: string | null;
  status: 'IDLE' | 'RUNNING' | 'PAUSED_PEAK_HOURS' | 'COMPLETED' | 'ERROR';
  isWeekendMode: boolean;
  isOffPeakTime: boolean;
  lastRunAt: string | null;
  lastError: string | null;
}

export class HistoricalBackfillService {
  private isBistBackfillRunning = false;
  private isTefasBackfillRunning = false;
  private isCryptoBackfillRunning = false;
  private shouldStop = false;

  /**
   * Helper to determine if current time is within safe off-market or weekend window
   * Friday 19:00 -> Monday 10:00 OR Weekdays 18:30 -> 08:30
   */
  isOffPeakOrWeekend(): { isOffPeak: boolean; isWeekend: boolean; reason: string } {
    const now = new Date();
    // Turkey Time (UTC+3)
    const trHour = (now.getUTCHours() + 3) % 24;
    const trDay = (now.getUTCDay() + (now.getUTCHours() + 3 >= 24 ? 1 : 0)) % 7; // 0=Sunday, 5=Friday, 6=Saturday

    // Weekend check: Friday 19:00 to Monday 10:00
    const isFridayNight = trDay === 5 && trHour >= 19;
    const isSaturday = trDay === 6;
    const isSunday = trDay === 0;
    const isMondayMorning = trDay === 1 && trHour < 10;

    if (isFridayNight || isSaturday || isSunday || isMondayMorning) {
      return {
        isOffPeak: true,
        isWeekend: true,
        reason: 'Hafta Sonu Penceresi (Cuma 19:00 - Pazartesi 10:00): Piyasa kapalı, derin geçmiş veri çekimi için %100 güvenli.'
      };
    }

    // Weekday night check: 18:30 - 08:30
    if (trHour >= 19 || trHour < 9) {
      return {
        isOffPeak: true,
        isWeekend: false,
        reason: 'Gece Seans Dışı Penceresi (19:00 - 09:00): BIST ve Takasbank seansları kapalı, sunucu yükü minimum.'
      };
    }

    return {
      isOffPeak: false,
      isWeekend: false,
      reason: 'Piyasa Seans Saatleri (10:00 - 18:00): Canlı veri trafiği aktif, bant koruması için aralıklı/düşük hız modu.'
    };
  }

  /**
   * Sleep helper with jitter
   */
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start 5-year BIST Stock OHLCV History Backfill with Anti-Ban Protection
   */
  async startBistHistoryBackfill(forceContinuous = false): Promise<void> {
    if (this.isBistBackfillRunning) return;
    this.isBistBackfillRunning = true;
    this.shouldStop = false;

    const taskName = 'BIST_5Y_DAILY_CANDLES';

    try {
      const allStocks = await db.select().from(bistStocks);
      const totalCount = allStocks.length;

      // Update state in DB
      await db.insert(backfillSyncState)
        .values({
          taskName,
          totalItems: totalCount,
          completedItems: 0,
          status: 'RUNNING',
          isWeekendMode: this.isOffPeakOrWeekend().isWeekend,
          lastRunAt: new Date()
        })
        .onConflictDoUpdate({
          target: backfillSyncState.taskName,
          set: {
            status: 'RUNNING',
            totalItems: totalCount,
            isWeekendMode: this.isOffPeakOrWeekend().isWeekend,
            lastRunAt: new Date()
          }
        });

      let completed = 0;

      for (const stock of allStocks) {
        if (this.shouldStop) {
          await db.update(backfillSyncState)
            .set({ status: 'IDLE', updatedAt: new Date() })
            .where(eq(backfillSyncState.taskName, taskName));
          break;
        }

        const timing = this.isOffPeakOrWeekend();

        // Update current progress in state
        await db.update(backfillSyncState)
          .set({
            completedItems: completed,
            currentItem: stock.ticker,
            isWeekendMode: timing.isWeekend,
            updatedAt: new Date()
          })
          .where(eq(backfillSyncState.taskName, taskName));

        try {
          // Sync 5-year data for this single stock
          await bistUniverseService.syncStock5YearHistory(stock.ticker);
          completed++;

          // Granular event emit: emit progress every 10 items or on completion
          if (completed % 10 === 0 || completed === totalCount) {
            appEventBus.emitOfficeEvent({
              type: 'BACKFILL_PROGRESS_TICK',
              actor: 'BACKFILL_SERVICE',
              department: 'BACKFILL',
              status: 'BUSY',
              detail: `BIST 5Y Arşivleme İlerlemesi: ${completed}/${totalCount} (${stock.ticker})`,
              payload: { completed, totalCount, ticker: stock.ticker, isWeekendMode: timing.isWeekend }
            });
          }
        } catch (err: any) {
          console.warn(`[Backfill] Ticker ${stock.ticker} error:`, err.message);
        }

        // --- SMART ANTI-BAN DELAYS ---
        // Off-peak / Weekend: 500ms - 900ms delay
        // Seans / Peak hours: 1500ms - 2500ms delay + 5s cooldown every 10 stocks
        const baseDelay = timing.isOffPeak ? 600 : 1800;
        const jitter = Math.floor(Math.random() * 400);
        await this.sleep(baseDelay + jitter);

        // Cooldown every 10 items
        if (completed % 10 === 0) {
          await this.sleep(timing.isOffPeak ? 2000 : 4000);
        }
      }

      await db.update(backfillSyncState)
        .set({
          status: 'COMPLETED',
          completedItems: completed,
          currentItem: 'TAMAMLANDI',
          updatedAt: new Date()
        })
        .where(eq(backfillSyncState.taskName, taskName));

    } catch (error: any) {
      console.error('[Backfill BIST Error]:', error.message);
      await db.update(backfillSyncState)
        .set({ status: 'ERROR', lastError: error.message, updatedAt: new Date() })
        .where(eq(backfillSyncState.taskName, taskName));
    } finally {
      this.isBistBackfillRunning = false;
    }
  }

  /**
   * Start 5-year TEFAS Fund NAV Price History Backfill with Anti-Ban Protection
   */
  async startTefasHistoryBackfill(): Promise<void> {
    if (this.isTefasBackfillRunning) return;
    this.isTefasBackfillRunning = true;
    this.shouldStop = false;

    const taskName = 'TEFAS_5Y_DAILY_NAVS';

    try {
      const allFunds = await db.select().from(tefasFunds);
      const totalCount = allFunds.length;

      await db.insert(backfillSyncState)
        .values({
          taskName,
          totalItems: totalCount,
          completedItems: 0,
          status: 'RUNNING',
          isWeekendMode: this.isOffPeakOrWeekend().isWeekend,
          lastRunAt: new Date()
        })
        .onConflictDoUpdate({
          target: backfillSyncState.taskName,
          set: {
            status: 'RUNNING',
            totalItems: totalCount,
            isWeekendMode: this.isOffPeakOrWeekend().isWeekend,
            lastRunAt: new Date()
          }
        });

      let completed = 0;

      for (const fund of allFunds) {
        if (this.shouldStop) {
          await db.update(backfillSyncState)
            .set({ status: 'IDLE', updatedAt: new Date() })
            .where(eq(backfillSyncState.taskName, taskName));
          break;
        }

        const timing = this.isOffPeakOrWeekend();

        await db.update(backfillSyncState)
          .set({
            completedItems: completed,
            currentItem: fund.code,
            isWeekendMode: timing.isWeekend,
            updatedAt: new Date()
          })
          .where(eq(backfillSyncState.taskName, taskName));

        try {
          // Fetch historical price curve from TEFAS or generate realistic daily NAV series for 5 years
          await this.syncSingleFundHistory(fund.code);
          completed++;

          // Granular event emit: emit progress every 10 funds or on completion
          if (completed % 10 === 0 || completed === totalCount) {
            appEventBus.emitOfficeEvent({
              type: 'BACKFILL_PROGRESS_TICK',
              actor: 'BACKFILL_SERVICE',
              department: 'BACKFILL',
              status: 'BUSY',
              detail: `TEFAS 5Y Arşivleme İlerlemesi: ${completed}/${totalCount} (${fund.code})`,
              payload: { completed, totalCount, fundCode: fund.code, isWeekendMode: timing.isWeekend }
            });
          }
        } catch (err: any) {
          console.warn(`[Backfill TEFAS] Fund ${fund.code} error:`, err.message);
        }

        // Smart Rate Limiting Delay
        const baseDelay = timing.isOffPeak ? 700 : 2000;
        const jitter = Math.floor(Math.random() * 500);
        await this.sleep(baseDelay + jitter);

        // Cooldown every 12 funds
        if (completed % 12 === 0) {
          await this.sleep(timing.isOffPeak ? 2500 : 5000);
        }
      }

      await db.update(backfillSyncState)
        .set({
          status: 'COMPLETED',
          completedItems: completed,
          currentItem: 'TAMAMLANDI',
          updatedAt: new Date()
        })
        .where(eq(backfillSyncState.taskName, taskName));

    } catch (error: any) {
      console.error('[Backfill TEFAS Error]:', error.message);
      await db.update(backfillSyncState)
        .set({ status: 'ERROR', lastError: error.message, updatedAt: new Date() })
        .where(eq(backfillSyncState.taskName, taskName));
    } finally {
      this.isTefasBackfillRunning = false;
    }
  }

  /**
   * Sync 5-year daily history for a single TEFAS fund
   */
  private async syncSingleFundHistory(fundCode: string) {
    const code = fundCode.toUpperCase();
    
    // Check if we already have records
    const existing = await db
      .select({ count: sql`count(*)` })
      .from(tefasHistoricalNavs)
      .where(eq(tefasHistoricalNavs.fundCode, code));

    if (Number(existing[0]?.count || 0) > 200) {
      // Already has historical data
      return;
    }

    // Official TEFAS 5-Year Historical Prices API
    try {
      const response = await axios.post(
        'https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir',
        {
          fonKodu: code,
          dil: 'TR',
          periyod: 60 // 60 months = 5 full years of daily NAV data
        },
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*'
          },
          timeout: 15000
        }
      );

      const items = response.data?.resultList || [];
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          const price = parseFloat(it.fiyat || it.FIYAT || '0');
          const dateStr = it.tarih || it.TARIH;
          if (price > 0 && dateStr) {
            await db.insert(tefasHistoricalNavs).values({
              fundCode: code,
              date: new Date(dateStr),
              price: price.toString(),
              marketCap: it.portfoyBuyukluk ? it.portfoyBuyukluk.toString() : null,
              shares: it.tedPaySayisi ? it.tedPaySayisi.toString() : null,
              investorCount: it.kategoriDerece ? parseInt(it.kategoriDerece, 10) : null
            }).onConflictDoNothing();
          }
        }
        return;
      }
    } catch (e: any) {
      console.warn(`[TEFAS Backfill] ${code} gerçek 5 yıllık veri çekimi hatası:`, e.message);
    }
  }

  async startCryptoHistoryBackfill(): Promise<void> {
    if (this.isCryptoBackfillRunning) return;
    this.isCryptoBackfillRunning = true;
    this.shouldStop = false;

    const taskName = 'CRYPTO_5Y_DAILY_CANDLES';

    try {
      const allCoins = await db.select().from(cryptoCoins).where(eq(cryptoCoins.isActive, true));
      const totalCount = allCoins.length;

      if (totalCount === 0) {
        this.isCryptoBackfillRunning = false;
        return;
      }

      await db.insert(backfillSyncState)
        .values({
          taskName,
          totalItems: totalCount,
          completedItems: 0,
          status: 'RUNNING',
          isWeekendMode: this.isOffPeakOrWeekend().isWeekend,
          lastRunAt: new Date()
        })
        .onConflictDoUpdate({
          target: backfillSyncState.taskName,
          set: {
            status: 'RUNNING',
            totalItems: totalCount,
            isWeekendMode: this.isOffPeakOrWeekend().isWeekend,
            lastRunAt: new Date()
          }
        });

      let completed = 0;

      for (const coin of allCoins) {
        if (this.shouldStop) {
          await db.update(backfillSyncState)
            .set({ status: 'IDLE', updatedAt: new Date() })
            .where(eq(backfillSyncState.taskName, taskName));
          break;
        }

        const timing = this.isOffPeakOrWeekend();

        await db.update(backfillSyncState)
          .set({
            completedItems: completed,
            currentItem: coin.symbol,
            isWeekendMode: timing.isWeekend,
            updatedAt: new Date()
          })
          .where(eq(backfillSyncState.taskName, taskName));

        try {
          const pair = `${coin.symbol}USDT`;
          // Fetch 1000 candles representing roughly 3 years of daily data (Binance limit is 1000)
          // We can just do one call of 1000 for simplicity and to stay under rate limits (1000 days is ~2.7 years)
          const res = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
              symbol: pair,
              interval: '1d',
              limit: 1000
            },
            timeout: 10000
          });

          const candles = res.data;
          if (Array.isArray(candles) && candles.length > 0) {
            const records = candles.map((c: any) => ({
              symbol: coin.symbol,
              timeframe: '1d',
              time: new Date(c[0]),
              open: parseFloat(c[1]).toString(),
              high: parseFloat(c[2]).toString(),
              low: parseFloat(c[3]).toString(),
              close: parseFloat(c[4]).toString(),
              volume: parseFloat(c[5]).toString()
            }));

            // Insert in chunks
            for (let i = 0; i < records.length; i += 200) {
              const chunk = records.slice(i, i + 200);
              await db.insert(cryptoCandles)
                .values(chunk)
                .onConflictDoNothing(); // ignore duplicates based on symbol/time/timeframe (assuming unique constraint exists, if not it just inserts)
            }
          }

          appEventBus.emitOfficeEvent({
            type: 'BACKFILL_PROGRESS_TICK',
            actor: 'BACKFILL_SERVICE',
            department: 'KRIPTO',
            status: 'BUSY',
            detail: `[CRYPTO-5Y] ${coin.symbol} günlük tarihi mum verileri (1000 gün) başarıyla yüklendi.`
          });
        } catch (err: any) {
          console.warn(`[Crypto Backfill] Hata (${coin.symbol}):`, err.message);
        }

        completed++;
        await db.update(backfillSyncState)
          .set({
            completedItems: completed,
            updatedAt: new Date()
          })
          .where(eq(backfillSyncState.taskName, taskName));

        // Sleep to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!this.shouldStop) {
        await db.update(backfillSyncState)
          .set({
            status: 'COMPLETED',
            completedItems: completed,
            currentItem: 'TAMAMLANDI',
            updatedAt: new Date()
          })
          .where(eq(backfillSyncState.taskName, taskName));

        appEventBus.emitOfficeEvent({
          type: 'BACKFILL_WINDOW_STATUS',
          actor: 'BACKFILL_SERVICE',
          department: 'BACKFILL',
          status: 'SUCCESS',
          detail: 'Kripto Para tarihi veri seti (Top 500 Coin) başarıyla tamamlandı.'
        });
      }
    } catch (error: any) {
      await db.update(backfillSyncState)
        .set({ status: 'ERROR', lastError: error.message, updatedAt: new Date() })
        .where(eq(backfillSyncState.taskName, taskName));
      console.error('[Crypto Backfill] Genel Hata:', error);
    } finally {
      this.isCryptoBackfillRunning = false;
    }
  }

  /**
   * Get live status of all historical backfill tasks
   */
  async getStatus(): Promise<{
    timing: ReturnType<HistoricalBackfillService['isOffPeakOrWeekend']>;
    tasks: BackfillStatus[];
  }> {
    const timing = this.isOffPeakOrWeekend();
    const rows = await db.select().from(backfillSyncState);

    const tasks: BackfillStatus[] = rows.map(r => {
      const total = r.totalItems || 1;
      const completed = r.completedItems || 0;
      const progressPct = Math.min(100, Math.round((completed / total) * 100));

      return {
        taskName: r.taskName,
        totalItems: r.totalItems || 0,
        completedItems: r.completedItems || 0,
        progressPct,
        currentItem: r.currentItem,
        status: (r.status as any) || 'IDLE',
        isWeekendMode: r.isWeekendMode || false,
        isOffPeakTime: timing.isOffPeak,
        lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
        lastError: r.lastError
      };
    });

    return { timing, tasks };
  }

  /**
   * Stop any active backfill safely
   */
  stopBackfill() {
    this.shouldStop = true;
  }
}

export const historicalBackfillService = new HistoricalBackfillService();
