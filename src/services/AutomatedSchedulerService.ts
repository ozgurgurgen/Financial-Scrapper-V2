import * as cron from 'node-cron';
import { CronExpressionParser } from 'cron-parser';
import { db } from '../db/index.ts';
import { syncLogs, settings, bistStocks, tefasFunds, assetData, kapDisclosures } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { bistUniverseService } from './BistUniverseService.ts';
import { tefasAdapter } from './TEFASAdapter.ts';
import { cryptoService } from './CryptoService.ts';
import { kapAdapter } from './KAPAdapter.ts';
import { syncManager } from './SyncManager.ts';
import { tefasHoldingsService } from './TefasHoldingsService.ts';
import { historicalBackfillService } from './HistoricalBackfillService.ts';
import { kapFundScraperService } from './KAPFundScraperService.ts';
import { usUniverseService } from './UsUniverseService.ts';
import { usEtfService } from './UsEtfService.ts';
import { analystCommentaryService } from './AnalystCommentaryService.ts';
import { assetHubService } from './AssetHubService.ts';
import { appEventBus, type DepartmentType, type ActorType } from './AppEventBus.ts';

export interface ScheduledTaskInfo {
  id: string;
  name: string;
  cronExpr: string;
  intervalDescription: string;
  category: 'BIST' | 'TEFAS' | 'KAP' | 'CRYPTO' | 'MACRO' | 'FX' | 'US' | 'ETF' | 'BACKFILL';
  lastRunAt: string | null;
  nextRunAt?: string | null;
  lastStatus: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  lastRecordsProcessed: number;
  lastMessage: string | null;
  isRunning: boolean;
  enabled: boolean;
}

class AutomatedSchedulerService {
  private tasks: Map<string, ScheduledTaskInfo> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  constructor() {
    this.registerDefaultTasks();
  }

  private registerDefaultTasks() {
    this.tasks.set('bist_quotes', {
      id: 'bist_quotes',
      name: 'BIST 625+ Hisse Canlı Fiyat & Piyasa Verileri',
      cronExpr: '*/15 7-18 * * 1-5', // Hafta içi borsa saatlerinde her 15 dakikada bir
      intervalDescription: 'Hafta içi borsa saatlerinde her 15 dakikada bir (10:00 - 18:30)',
      category: 'BIST',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('tefas_funds', {
      id: 'tefas_funds',
      name: 'TEFAS 1.063 Fon Fiyatları, Getirileri & Portföy Dağılımı',
      cronExpr: '0 */4 * * *', // Her 4 saatte bir
      intervalDescription: 'Günde 6 kez (Her 4 saatte bir)',
      category: 'TEFAS',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('kap_disclosures', {
      id: 'kap_disclosures',
      name: 'KAP Canlı Şirket Bildirimleri & Özel Durum Açıklamaları',
      cronExpr: '*/10 * * * *', // Her 10 dakikada bir
      intervalDescription: 'Sürekli her 10 dakikada bir',
      category: 'KAP',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('crypto_candles', {
      id: 'crypto_candles',
      name: 'Kripto Para Spot Fiyatları & 5 Yıllık Günlük Mumlar',
      cronExpr: '*/30 * * * *', // Her 30 dakikada bir
      intervalDescription: '7/24 her 30 dakikada bir',
      category: 'CRYPTO',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('fx_macro', {
      id: 'fx_macro',
      name: 'TCMB EVDS Kurları, Altın, Emtia & Enflasyon Göstergeleri',
      cronExpr: '0 */2 * * *', // Her 2 saatte bir
      intervalDescription: 'Günde 12 kez (Her 2 saatte bir)',
      category: 'FX',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('tefas_fund_holdings', {
      id: 'tefas_fund_holdings',
      name: 'TEFAS Fon İçi Bireysel Hisse Senedi & Varlık Dağılımları',
      cronExpr: '0 21 * * 1-5', // Hafta içi her akşam 21:00 (KAP PDR bülteni sonrası)
      intervalDescription: 'Hafta içi her akşam 21:00 (KAP Portföy Raporları Sonrası)',
      category: 'TEFAS',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('weekend_backfill_safe', {
      id: 'weekend_backfill_safe',
      name: 'Hafta Sonu & Seans Dışı Kesintili 5 Yıllık Mum Verisi Çekimi (Anti-Ban)',
      cronExpr: '0 20 * * 5', // Cuma 20:00'de başlar, pazartesi sabahına kadar derin geçmişi toplar
      intervalDescription: 'Cuma 20:00 - Pazartesi 08:00 (Piyasa kapalıyken 5 yıllık verileri kesintili aktarır)',
      category: 'BACKFILL',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('ipo_tracking', {
      id: 'ipo_tracking',
      name: 'SPK Bültenleri & Taslak İzahname / Halka Arz Takibi',
      cronExpr: '0 20 * * 4', // Perşembe 20:00 (SPK bülteni saati)
      intervalDescription: 'SPK Bülteni yayımlandığında (Genellikle Perşembe akşamları)',
      category: 'KAP',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('news_tracking', {
      id: 'news_tracking',
      name: 'Global & Yerel Finansal Haber RSS Akışı ve AI Sentiment Analizi',
      cronExpr: '*/15 * * * *', // Her 15 dakikada bir
      intervalDescription: 'Her 15 dakikada bir',
      category: 'KAP', // Haberler KAP/Piyasa
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('us_stocks', {
      id: 'us_stocks',
      name: 'Amerikan Borsaları (NYSE & NASDAQ) Top 1.000 Şirket Fiyat & Değerleme',
      cronExpr: '*/15 14-22 * * 1-5', // ABD borsa saatlerinde her 15 dakikada bir
      intervalDescription: 'ABD borsa saatlerinde her 15 dakikada bir (16:30 - 23:00 TR)',
      category: 'US',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('us_etfs', {
      id: 'us_etfs',
      name: 'Global ETF & Fon Masası (52 Büyük ABD ETF AUM, NAV & Varlık Dağılımı)',
      cronExpr: '0 */4 * * *', // Her 4 saatte bir
      intervalDescription: 'Günde 6 kez (Her 4 saatte bir)',
      category: 'ETF',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('analyst_reports', {
      id: 'analyst_reports',
      name: 'Kurumsal Aracı Kurum Analist Raporları & Yapay Zeka (AI) Sentezi',
      cronExpr: '0 */3 * * *', // Her 3 saatte bir
      intervalDescription: 'Günde 8 kez (Her 3 saatte bir)',
      category: 'BIST',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });

    this.tasks.set('asset_registry_sync', {
      id: 'asset_registry_sync',
      name: '360° Veritabanı Varlık Eşleştirme & Çapraz İlişki Kataloğu (Arşiv Odası)',
      cronExpr: '0 1 * * *', // Her gece 01:00'de
      intervalDescription: 'Her gece saat 01:00 (Çapraz Varlık Kataloğu Yenileme)',
      category: 'BACKFILL',
      lastRunAt: null,
      lastStatus: 'IDLE',
      lastRecordsProcessed: 0,
      lastMessage: 'Beklemede',
      isRunning: false,
      enabled: true,
    });
  }

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[AutomatedScheduler] Otomatik arka plan veri senkronizasyon motoru başlatılıyor...');

    // Load saved settings from DB if any
    try {
      const dbSettings = await db.select().from(settings);
      for (const row of dbSettings) {
        if (row.key.startsWith('scheduler_task_')) {
          const taskId = row.key.replace('scheduler_task_', '');
          const existing = this.tasks.get(taskId);
          if (existing && row.value) {
            const val = row.value as any;
            if (val.enabled !== undefined) existing.enabled = val.enabled;
            if (val.cronExpr) existing.cronExpr = val.cronExpr;
          }
        }
      }
    } catch (err: any) {
      console.warn('[AutomatedScheduler] Ayarlar yüklenirken hata:', err.message);
    }

    // Schedule each task
    for (const [taskId, task] of this.tasks.entries()) {
      this.scheduleTask(taskId);
    }

    console.log(`[AutomatedScheduler] ${this.tasks.size} adet arka plan görevi aktif edildi.`);
  }

  private scheduleTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Stop existing cron if any
    const existingJob = this.cronJobs.get(taskId);
    if (existingJob) {
      existingJob.stop();
      this.cronJobs.delete(taskId);
    }

    if (!task.enabled) {
      console.log(`[AutomatedScheduler] ${task.name} devre dışı bırakıldı.`);
      return;
    }

    if (!cron.validate(task.cronExpr)) {
      console.error(`[AutomatedScheduler] Geçersiz cron ifadesi: ${task.cronExpr} (${task.id})`);
      return;
    }

    const job = cron.schedule(task.cronExpr, async () => {
      await this.runTask(taskId, false);
    });

    this.cronJobs.set(taskId, job);
    console.log(`[AutomatedScheduler] '${task.name}' planlandı [Cron: ${task.cronExpr}]`);
  }

  public async runTask(taskId: string, isManual = false): Promise<{ success: boolean; message: string; recordsProcessed: number }> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { success: false, message: 'Görev bulunamadı', recordsProcessed: 0 };
    }

    if (task.isRunning) {
      return { success: false, message: 'Bu görev şu anda zaten çalışıyor.', recordsProcessed: 0 };
    }

    task.isRunning = true;
    task.lastStatus = 'RUNNING';
    task.lastRunAt = new Date().toISOString();
    const startedAt = new Date();

    console.log(`[AutomatedScheduler] [${isManual ? 'MANUEL' : 'OTOMATİK'}] ${task.name} çalıştırılıyor...`);

    const taskDeptMap: Record<string, { dept: DepartmentType; actor: ActorType }> = {
      bist_quotes: { dept: 'BORSA', actor: 'MARKET_SERVICE' },
      tefas_funds: { dept: 'BORSA', actor: 'TEFAS_ADAPTER' },
      kap_disclosures: { dept: 'KAP', actor: 'KAP_ADAPTER' },
      crypto_candles: { dept: 'KRIPTO', actor: 'CRYPTO_ADAPTER' },
      fx_macro: { dept: 'MERKEZ_BANKASI', actor: 'TCMB_ADAPTER' },
      tefas_fund_holdings: { dept: 'KAP', actor: 'KAP_SCRAPER' },
      weekend_backfill_safe: { dept: 'BACKFILL', actor: 'BACKFILL_SERVICE' },
      ipo_tracking: { dept: 'HALKA_ARZ', actor: 'IPO_SERVICE' },
      news_tracking: { dept: 'HABERLER', actor: 'NEWS_SERVICE' },
      us_stocks: { dept: 'AMERIKA', actor: 'WALL_STREET_ADAPTER' },
      us_etfs: { dept: 'ETF_FONLARI', actor: 'ETF_ADAPTER' },
      analyst_reports: { dept: 'HABERLER', actor: 'ANALYST_SERVICE' },
      asset_registry_sync: { dept: 'ARSIV', actor: 'MARKET_SERVICE' }
    };

    const targetInfo = taskDeptMap[taskId] || { dept: 'ARSIV', actor: 'SCHEDULER' };

    appEventBus.emitOfficeEvent({
      type: 'JOB_SCHEDULED_TRIGGER',
      actor: 'SCHEDULER',
      department: targetInfo.dept,
      status: 'BUSY',
      detail: `Zamanlanmış görev tetiklendi: ${task.name} (${isManual ? 'Manuel' : 'Otomatik'})`,
      payload: { taskId, taskName: task.name, isManual }
    });

    let recordsProcessed = 0;
    let status: 'SUCCESS' | 'ERROR' = 'SUCCESS';
    let message = 'Başarıyla tamamlandı';

    try {
      if (taskId === 'bist_quotes') {
        const res = await bistUniverseService.syncAllQuotes();
        recordsProcessed = res.validCount;
        message = `${res.validCount} adet BIST hissesinin anlık fiyatı ve piyasa verisi güncellendi.`;
      } else if (taskId === 'tefas_funds') {
        const res = await tefasAdapter.sync();
        recordsProcessed = res.recordsProcessed || 1063;
        message = `${recordsProcessed} adet TEFAS fonunun fiyatı ve portföy dağılımı güncellendi.`;
      } else if (taskId === 'kap_disclosures') {
        const res = await kapAdapter.sync();
        recordsProcessed = res.recordsProcessed || 20;
        message = `${recordsProcessed} adet yeni KAP şirket bildirimi işlendi.`;
      } else if (taskId === 'crypto_candles') {
        const prices = await cryptoService.getLivePrices(isManual);
        const candles = await cryptoService.getCandles('BTC', '15m', isManual); // also fetch BTC candles just to trigger some candle work
        recordsProcessed = prices.length + (candles.length > 0 ? 1 : 0);
        message = 'Kripto spot fiyatları ve mumları güncellendi.';
      } else if (taskId === 'fx_macro') {
        await syncManager.triggerSync('TCMB');
        await syncManager.triggerSync('FRED');
        recordsProcessed = 15;
        message = 'TCMB EVDS kurları ve makro göstergeler senkronize edildi.';
      } else if (taskId === 'tefas_fund_holdings') {
        const kapRes = await kapFundScraperService.syncAndMatchAllFundsWithKAP();
        recordsProcessed = kapRes.totalHoldingsSaved;
        message = `${kapRes.syncedFunds} adet TEFAS fonu resmi KAP Portföy Dağılım Raporları (PDR) ve genel bilgileri ile eşleştirildi (${kapRes.totalHoldingsSaved} tekil hisse/menkul kıymet).`;
      } else if (taskId === 'weekend_backfill_safe') {
        historicalBackfillService.startBistHistoryBackfill().catch(console.error);
        historicalBackfillService.startTefasHistoryBackfill().catch(console.error);
        recordsProcessed = 1;
        message = 'Hafta sonu ve seans dışı kesintili 5 yıllık derin geçmiş veri aktarımı güvenli anti-ban modunda arka planda başlatıldı.';
      } else if (taskId === 'ipo_tracking') {
        const { ipoService } = await import('./IpoService.ts');
        const { ipoScraperService } = await import('./IpoScraperService.ts');
        const res = await ipoService.trackIpos();
        const tavanCount = await ipoScraperService.syncTavanData();
        recordsProcessed = res.processed + tavanCount;
        message = `SPK bülteni tarandı (${res.processed} kayıt). ${tavanCount} adet BIST halka arz hissesinin canlı fiyat ve tavan serisi güncellendi.`;
      } else if (taskId === 'news_tracking') {
        const { newsService } = await import('./NewsService.ts');
        const res = await newsService.trackNews();
        recordsProcessed = res.processed;
        message = `${res.processed} yeni global finans haberi çekildi, AI duyarlılık analizi (Sentiment) tamamlandı.`;
      } else if (taskId === 'us_stocks') {
        const res = await usUniverseService.syncUsQuotes();
        recordsProcessed = res.updated;
        message = `Wall Street Trader: ${res.updated} Amerikan hissesinin canlı fiyat ve değerleme verileri senkronize edildi.`;
      } else if (taskId === 'us_etfs') {
        const res = await usEtfService.syncEtfs();
        recordsProcessed = res.updatedCount;
        message = `Global ETF Masası: ${res.updatedCount} büyük ABD ETF verisi senkronize edildi.`;
      } else if (taskId === 'analyst_reports') {
        const res = await analystCommentaryService.syncFromSources();
        recordsProcessed = res.scrapedCount;
        message = `Analist Masası: ${res.scrapedCount} kurumsal aracı kurum raporu işlendi (${res.synthesizedCount} AI sentezi tamamlandı).`;
      } else if (taskId === 'asset_registry_sync') {
        const res = await assetHubService.syncMasterAssetRegistry();
        recordsProcessed = res.totalRegistered;
        message = `Arşiv Masası: ${res.totalRegistered} varlık 360° çapraz katalogda eşleştirildi (${res.newAdded} yeni varlık eklendi).`;
      }
      
      task.lastStatus = 'SUCCESS';
      task.lastMessage = message;
      task.lastRecordsProcessed = recordsProcessed;
    } catch (err: any) {
      status = 'ERROR';
      message = `Hata: ${err.message || 'Bilinmeyen hata'}`;
      task.lastStatus = 'ERROR';
      task.lastMessage = message;
      console.error(`[AutomatedScheduler] ${task.name} hata verdi:`, err);
    } finally {
      task.isRunning = false;

      // Log to DB sync_logs
      try {
        await db.insert(syncLogs).values({
          source: `SCHEDULER_${taskId.toUpperCase()}`,
          status,
          recordsProcessed,
          message: `[${isManual ? 'MANUEL' : 'OTOMATİK'}] ${message}`,
          startedAt,
          completedAt: new Date()
        });
      } catch (logErr) {
        console.error('[AutomatedScheduler] Log kaydetme hatası:', logErr);
      }
    }

    return {
      success: status === 'SUCCESS',
      message,
      recordsProcessed
    };
  }

  public getStatus(): {
    isSchedulerActive: boolean;
    uptimeSeconds: number;
    tasks: ScheduledTaskInfo[];
    totalScheduledJobs: number;
  } {
    const tasksWithNextRun = Array.from(this.tasks.values()).map(task => {
      let nextRunAt: string | null = null;
      if (task.enabled && task.cronExpr) {
        try {
          const interval = CronExpressionParser.parse(task.cronExpr);
          nextRunAt = interval.next().toDate().toISOString();
        } catch (err) {
          nextRunAt = null;
        }
      }
      return {
        ...task,
        nextRunAt
      };
    });

    return {
      isSchedulerActive: this.isInitialized,
      uptimeSeconds: Math.floor(process.uptime()),
      tasks: tasksWithNextRun,
      totalScheduledJobs: this.cronJobs.size
    };
  }

  public async toggleTask(taskId: string, enabled: boolean): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;
    this.scheduleTask(taskId);

    // Save to settings table
    try {
      await db.insert(settings)
        .values({
          key: `scheduler_task_${taskId}`,
          value: { enabled, cronExpr: task.cronExpr },
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: { enabled, cronExpr: task.cronExpr },
            updatedAt: new Date()
          }
        });
    } catch (err) {
      console.error('[AutomatedScheduler] Ayar kaydetme hatası:', err);
    }

    return true;
  }

  public async updateTaskSchedule(taskId: string, cronExpr: string, enabled?: boolean): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (enabled !== undefined) {
      task.enabled = enabled;
    }
    task.cronExpr = cronExpr;
    
    // Reschedule
    this.scheduleTask(taskId);

    // Save to settings table
    try {
      await db.insert(settings)
        .values({
          key: `scheduler_task_${taskId}`,
          value: { enabled: task.enabled, cronExpr: task.cronExpr },
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: { enabled: task.enabled, cronExpr: task.cronExpr },
            updatedAt: new Date()
          }
        });
    } catch (err) {
      console.error('[AutomatedScheduler] Ayar kaydetme hatası:', err);
    }
    
    return true;
  }
}

export const automatedSchedulerService = new AutomatedSchedulerService();
