import axios from 'axios';
import { db } from '../db/index.ts';
import { settings, bistStocks, tefasFunds, kapDisclosures, assetData } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { circuitBreakerRegistry } from './CircuitBreaker.ts';
import { proxyChainService } from './ProxyChainService.ts';
import { offlineRingBuffer } from './OfflineRingBuffer.ts';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  alertOnFailover: boolean;
  alertOnErrors: boolean;
  alertOnCircuitBreaker: boolean;
  alertOnSyncFailure: boolean;
  healthReportIntervalMinutes: number; // 0 (Disabled), 15, 30, 60, 180, 360, 720, 1440
  healthReportStartHour?: string; // e.g. "09:00" - Hangi saatten itibaren periyodik mesaj atacağı
  healthReportEndHour?: string; // e.g. "23:00" - Bitiş saati (opsiyonel)
  healthReportWeekendEnabled?: boolean; // Hafta sonu gönderilsin mi? (varsayılan: true)
  lastHealthReportAt?: string;
  lastAlertAt?: string;
  silentMode?: boolean;
}

export interface TelegramDeliveryLog {
  id: string;
  type: 'ALERT' | 'HEALTH_REPORT' | 'TEST';
  timestamp: string;
  status: 'SENT' | 'FAILED';
  summary: string;
  error?: string;
}

export class TelegramService {
  private static instance: TelegramService;
  private configCache: TelegramConfig | null = null;
  private healthIntervalTimer: NodeJS.Timeout | null = null;
  private deliveryLogs: TelegramDeliveryLog[] = [];
  private lastAlertTimestampMap = new Map<string, number>();

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  constructor() {
    // Initialize periodic timer on bootstrap
    this.initScheduler();
  }

  private async initScheduler() {
    try {
      const config = await this.getConfig();
      if (config.enabled && config.healthReportIntervalMinutes > 0) {
        this.rescheduleHealthReport();
      }
    } catch (e) {
      console.warn('[TelegramService] Scheduler init warning:', e);
    }
  }

  public getIstanbulTime(date: Date = new Date()): {
    hour: number;
    minute: number;
    totalMinutes: number;
    dayOfWeek: number;
    timeString: string;
    formattedFull: string;
  } {
    const formatter = new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      weekday: 'short',
    });
    const weekdayStr = dayFormatter.format(date);
    const daysMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = daysMap[weekdayStr] ?? date.getDay();

    return {
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
      dayOfWeek,
      timeString: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      formattedFull: date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
    };
  }

  public async getConfig(): Promise<TelegramConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      const row = await db.select().from(settings).where(eq(settings.key, 'telegram_alert_settings')).limit(1);
      if (row.length > 0 && row[0].value) {
        const val = row[0].value as any;
        this.configCache = {
          botToken: val.botToken || process.env.TELEGRAM_BOT_TOKEN || '',
          chatId: val.chatId || process.env.TELEGRAM_CHAT_ID || '',
          enabled: val.enabled ?? false,
          alertOnFailover: val.alertOnFailover ?? true,
          alertOnErrors: val.alertOnErrors ?? true,
          alertOnCircuitBreaker: val.alertOnCircuitBreaker ?? true,
          alertOnSyncFailure: val.alertOnSyncFailure ?? true,
          healthReportIntervalMinutes: val.healthReportIntervalMinutes ?? 60,
          healthReportStartHour: val.healthReportStartHour || '09:00',
          healthReportEndHour: val.healthReportEndHour ?? '23:00',
          healthReportWeekendEnabled: val.healthReportWeekendEnabled ?? true,
          lastHealthReportAt: val.lastHealthReportAt,
          lastAlertAt: val.lastAlertAt,
          silentMode: val.silentMode ?? false,
        };
        return this.configCache;
      }
    } catch (e) {
      console.error('[TelegramService] Failed to load config from DB:', e);
    }

    // Default configuration
    this.configCache = {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      alertOnFailover: true,
      alertOnErrors: true,
      alertOnCircuitBreaker: true,
      alertOnSyncFailure: true,
      healthReportIntervalMinutes: 60,
      healthReportStartHour: '09:00',
      healthReportEndHour: '23:00',
      healthReportWeekendEnabled: true,
    };
    return this.configCache;
  }

  public async saveConfig(newConfig: Partial<TelegramConfig>): Promise<TelegramConfig> {
    const current = await this.getConfig();
    const updated: TelegramConfig = {
      ...current,
      ...newConfig,
    };

    this.configCache = updated;

    try {
      await db
        .insert(settings)
        .values({
          key: 'telegram_alert_settings',
          value: updated,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: updated,
            updatedAt: new Date(),
          },
        });
    } catch (e) {
      console.error('[TelegramService] Failed to save config into DB:', e);
    }

    // Adjust health report scheduler timer
    if (updated.enabled && updated.healthReportIntervalMinutes > 0) {
      this.rescheduleHealthReport();
    } else {
      this.clearHealthScheduler();
    }

    return updated;
  }

  public rescheduleHealthReport() {
    this.clearHealthScheduler();

    const config = this.configCache;
    if (!config || !config.enabled || config.healthReportIntervalMinutes <= 0) {
      return;
    }

    const startH = config.healthReportStartHour || '09:00';
    const endH = config.healthReportEndHour || 'Yok';
    console.log(`[TelegramService] Sistem Sağlığı Raporlayıcısı aktif: Başlangıç: ${startH}, Bitiş: ${endH}, Her ${config.healthReportIntervalMinutes} dakikada bir kontrol.`);

    // Check on startup/reschedule
    this.checkAndTriggerHealthReport().catch((err) => {
      console.error('[TelegramService] Başlangıç sağlık kontrolü hatası:', err);
    });

    // Run active check every 30 seconds to catch the exact start time and intervals
    this.healthIntervalTimer = setInterval(async () => {
      try {
        await this.checkAndTriggerHealthReport();
      } catch (err) {
        console.error('[TelegramService] Periyodik sağlık kontrolü hatası:', err);
      }
    }, 30000);
  }

  public async checkAndTriggerHealthReport() {
    const config = await this.getConfig();
    if (!config.enabled || !config.botToken || !config.chatId || config.healthReportIntervalMinutes <= 0) {
      return;
    }

    const istanbulTime = this.getIstanbulTime();

    // Weekend filter
    const isWeekend = istanbulTime.dayOfWeek === 0 || istanbulTime.dayOfWeek === 6;
    if (isWeekend && config.healthReportWeekendEnabled === false) {
      return;
    }

    // Start Hour and End Hour check
    const startHourStr = (config.healthReportStartHour || '09:00').trim();
    const [startH, startM] = startHourStr.split(':').map((n) => parseInt(n, 10) || 0);
    const startTotalMinutes = startH * 60 + startM;

    let inWindow = false;
    if (config.healthReportEndHour && config.healthReportEndHour.trim()) {
      const [endH, endM] = config.healthReportEndHour.split(':').map((n) => parseInt(n, 10) || 0);
      const endTotalMinutes = endH * 60 + endM;
      if (endTotalMinutes >= startTotalMinutes) {
        inWindow = istanbulTime.totalMinutes >= startTotalMinutes && istanbulTime.totalMinutes <= endTotalMinutes;
      } else {
        // Overnight window
        inWindow = istanbulTime.totalMinutes >= startTotalMinutes || istanbulTime.totalMinutes <= endTotalMinutes;
      }
    } else {
      // Default: active from start hour until midnight
      inWindow = istanbulTime.totalMinutes >= startTotalMinutes;
    }

    if (!inWindow) {
      return;
    }

    // Check if enough time has passed since last health report
    const now = Date.now();
    const intervalMs = config.healthReportIntervalMinutes * 60 * 1000;
    const lastReportTime = config.lastHealthReportAt ? new Date(config.lastHealthReportAt).getTime() : 0;

    if (!config.lastHealthReportAt || now - lastReportTime >= intervalMs) {
      console.log(`[TelegramService] Belirlenen saat (${startHourStr}) aralığında periyodik sağlık raporu tetikleniyor...`);
      await this.sendHealthReport(false);
    }
  }

  public getNextScheduledReportInfo(): string {
    const config = this.configCache;
    if (!config || !config.enabled || !config.botToken || !config.chatId) {
      return 'Yapılandırılmadı veya Devre Dışı';
    }
    if (config.healthReportIntervalMinutes <= 0) {
      return 'Periyodik Raporlama Kapalı';
    }

    const istanbul = this.getIstanbulTime();
    const startHour = (config.healthReportStartHour || '09:00').trim();
    const [startH, startM] = startHour.split(':').map((n) => parseInt(n, 10) || 0);
    const startMinutes = startH * 60 + startM;

    let endMinutes = 24 * 60;
    if (config.healthReportEndHour && config.healthReportEndHour.trim()) {
      const [endH, endM] = config.healthReportEndHour.split(':').map((n) => parseInt(n, 10) || 0);
      endMinutes = endH * 60 + endM;
    }

    if (istanbul.totalMinutes < startMinutes) {
      return `Bugün saat ${startHour}'da başlayacak (TSİ)`;
    }

    if (config.healthReportEndHour && istanbul.totalMinutes > endMinutes) {
      return `Yarın saat ${startHour}'da başlayacak (TSİ)`;
    }

    if (config.lastHealthReportAt) {
      const nextTime = new Date(new Date(config.lastHealthReportAt).getTime() + config.healthReportIntervalMinutes * 60 * 1000);
      const nextIstanbul = this.getIstanbulTime(nextTime);
      if (config.healthReportEndHour && nextIstanbul.totalMinutes > endMinutes) {
        return `Yarın saat ${startHour}'da başlayacak (TSİ)`;
      }
      return `Bugün yaklaşık saat ${nextIstanbul.timeString}'da (TSİ)`;
    }

    return `Bugün saat ${startHour}'dan itibaren her ${config.healthReportIntervalMinutes} dakikada bir (TSİ)`;
  }

  private clearHealthScheduler() {
    if (this.healthIntervalTimer) {
      clearInterval(this.healthIntervalTimer);
      this.healthIntervalTimer = null;
    }
  }

  /**
   * Low-level Telegram sendMessage API caller
   */
  public async sendMessage(
    text: string,
    options: {
      parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
      silent?: boolean;
      customToken?: string;
      customChatId?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const config = await this.getConfig();
    const token = (options.customToken || config.botToken || '').trim();
    const chatId = (options.customChatId || config.chatId || '').trim();

    if (!token || !chatId) {
      return { success: false, error: 'Telegram Bot Token veya Chat ID yapılandırılmamış.' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const response = await axios.post(
        url,
        {
          chat_id: chatId,
          text: text,
          parse_mode: options.parseMode || 'HTML',
          disable_web_page_preview: true,
          disable_notification: options.silent ?? config.silentMode ?? false,
        },
        {
          timeout: 10000,
        }
      );

      if (response.data?.ok) {
        return { success: true, messageId: response.data.result?.message_id };
      } else {
        return { success: false, error: response.data?.description || 'Telegram API bilinmeyen hata döndürdü.' };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.description || err.message || 'Telegram sunucusuna bağlanılamadı.';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Sends critical system alerts, failovers, circuit trips and error events
   */
  public async sendAlert(alert: {
    title: string;
    type: 'ERROR' | 'FAILOVER' | 'CIRCUIT_BREAKER' | 'SYNC_FAILURE' | 'WARNING' | 'INFO';
    details: string;
    source?: string;
    url?: string;
    payload?: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig();

    if (!config.enabled || !config.botToken || !config.chatId) {
      return { success: false, error: 'Telegram bildirimleri kapalı veya yapılandırılmamış.' };
    }

    // Filter by type toggles
    if (alert.type === 'FAILOVER' && !config.alertOnFailover) return { success: true };
    if (alert.type === 'CIRCUIT_BREAKER' && !config.alertOnCircuitBreaker) return { success: true };
    if (alert.type === 'SYNC_FAILURE' && !config.alertOnSyncFailure) return { success: true };
    if (alert.type === 'ERROR' && !config.alertOnErrors) return { success: true };

    // Anti-spam rate limiter: max 1 alert per title/source per 30 seconds
    const throttleKey = `${alert.type}_${alert.source || ''}_${alert.title}`;
    const now = Date.now();
    const lastSent = this.lastAlertTimestampMap.get(throttleKey) || 0;
    if (now - lastSent < 30000) {
      return { success: true }; // throttled
    }
    this.lastAlertTimestampMap.set(throttleKey, now);

    const typeIcons: Record<string, string> = {
      ERROR: '🚨 <b>[KRİTİK HATA]</b>',
      FAILOVER: '⚡ <b>[OTOMATİK FAILOVER]</b>',
      CIRCUIT_BREAKER: '🛡️ <b>[DEVRE KESİCİ KARANTİNASI]</b>',
      SYNC_FAILURE: '🔄 <b>[SENKRONİZASYON HATASI]</b>',
      WARNING: '⚠️ <b>[UYARI]</b>',
      INFO: 'ℹ️ <b>[BİLGİLENDİRME]</b>',
    };

    const iconHeader = typeIcons[alert.type] || '🔔 <b>[SİSTEM ALARMI]</b>';
    const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

    let message = `${iconHeader}\n\n`;
    message += `<b>Konu:</b> ${this.escapeHtml(alert.title)}\n`;
    if (alert.source) {
      message += `<b>Servis / Kaynak:</b> <code>${this.escapeHtml(alert.source)}</code>\n`;
    }
    if (alert.url) {
      message += `<b>Uç Nokta:</b> <code>${this.escapeHtml(alert.url)}</code>\n`;
    }
    message += `<b>Zaman:</b> ${timeStr}\n\n`;
    message += `<b>Detaylar:</b>\n${this.escapeHtml(alert.details)}\n`;

    if (alert.payload && Object.keys(alert.payload).length > 0) {
      const jsonSnippet = JSON.stringify(alert.payload, null, 2).substring(0, 500);
      message += `\n<b>Teknik Veri:</b>\n<pre>${this.escapeHtml(jsonSnippet)}</pre>\n`;
    }

    message += `\n<i>🛡️ Zero-Downtime Resilience & Alert Engine</i>`;

    const result = await this.sendMessage(message);

    this.recordDeliveryLog({
      id: `log_${Date.now()}`,
      type: 'ALERT',
      timestamp: new Date().toISOString(),
      status: result.success ? 'SENT' : 'FAILED',
      summary: `[${alert.type}] ${alert.title}`,
      error: result.error,
    });

    if (result.success) {
      await this.saveConfig({ lastAlertAt: new Date().toISOString() });
    }

    return result;
  }

  /**
   * Generates and delivers a complete, rich System Health Report
   */
  public async sendHealthReport(forced: boolean = false): Promise<{ success: boolean; reportText?: string; error?: string }> {
    const config = await this.getConfig();
    if (!forced && (!config.enabled || !config.botToken || !config.chatId)) {
      return { success: false, error: 'Telegram bildirimleri aktif değil.' };
    }

    const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

    // Gather real-time statistics
    let bistCount = 0;
    let tefasCount = 0;
    let kapCount = 0;
    let assetDataCount = 0;

    try {
      const bRes = await db.select({ count: sql<number>`count(*)` }).from(bistStocks);
      bistCount = Number(bRes[0]?.count || 0);

      const tRes = await db.select({ count: sql<number>`count(*)` }).from(tefasFunds);
      tefasCount = Number(tRes[0]?.count || 0);

      const kRes = await db.select({ count: sql<number>`count(*)` }).from(kapDisclosures);
      kapCount = Number(kRes[0]?.count || 0);

      const aRes = await db.select({ count: sql<number>`count(*)` }).from(assetData);
      assetDataCount = Number(aRes[0]?.count || 0);
    } catch (e) {
      console.warn('[TelegramService] Health metrics db read issue:', e);
    }

    const circuitMetrics = circuitBreakerRegistry.getAllMetrics();
    const openCircuits = circuitMetrics.filter((c) => c.state === 'OPEN');
    const proxyTiers = proxyChainService.getTiers();
    const activeTiers = proxyTiers.filter((t) => t.active).length;
    const ringBufferStats = offlineRingBuffer.getBufferStats();

    const overallStatusEmoji = openCircuits.length === 0 ? '🟢' : openCircuits.length < 2 ? '🟡' : '🔴';
    const overallStatusText = openCircuits.length === 0 ? 'TÜM SİSTEMLER OPERASYONEL' : 'KISMEN YEDEKLİ ÇALIŞIYOR';

    let report = `${overallStatusEmoji} <b>SİSTEM SAĞLIK & DURUM RAPORU</b>\n`;
    report += `📅 <b>Rapor Zamanı:</b> ${timeStr}\n`;
    report += `⚡ <b>Genel Durum:</b> ${overallStatusText}\n\n`;

    report += `📊 <b>VERİTABANI VE CANLI VARLIK SAYILARI</b>\n`;
    report += `• <b>BIST Hisseleri:</b> ${bistCount.toLocaleString('tr-TR')} Kayıt\n`;
    report += `• <b>TEFAS Fonları:</b> ${tefasCount.toLocaleString('tr-TR')} Fon\n`;
    report += `• <b>KAP Bildirimleri:</b> ${kapCount.toLocaleString('tr-TR')} Açıklama\n`;
    report += `• <b>Toplam Fiyat & Veri Havuzu:</b> ${assetDataCount.toLocaleString('tr-TR')} Veri Noktası\n\n`;

    report += `🛡️ <b>SIFIR KESİNTİ & KALKAN METRİKLERİ</b>\n`;
    report += `• <b>Devre Kesiciler:</b> ${circuitMetrics.length} Nokta (${openCircuits.length === 0 ? 'Tümü Normal' : `${openCircuits.length} Karantinada`})\n`;
    report += `• <b>Proxy Zinciri:</b> ${activeTiers}/${proxyTiers.length} Kademeli Hat Aktif\n`;
    report += `• <b>Kalıcı Ring-Buffer:</b> ${ringBufferStats.length} Kategori Tamponlandı\n`;
    report += `• <b>AI Şema Onarıcı:</b> Çoklu Sağlayıcı YZ Motoru Hazır\n\n`;

    if (openCircuits.length > 0) {
      report += `⚠️ <b>KARANTİNADAKİ UÇ NOKTALAR:</b>\n`;
      openCircuits.forEach((c) => {
        report += `• <code>${this.escapeHtml(c.endpoint)}</code> (Hata: ${c.failures})\n`;
      });
      report += `\n`;
    }

    const startText = config.healthReportStartHour || '09:00';
    const endText = config.healthReportEndHour ? ` - ${config.healthReportEndHour}` : '';
    report += `💡 <i>Bu rapor belirlediğiniz zamanlama kuralı ile (${startText}${endText} arası, her ${config.healthReportIntervalMinutes} dakikada bir) otomatik üretilmiştir.</i>`;

    const result = await this.sendMessage(report);

    this.recordDeliveryLog({
      id: `log_${Date.now()}`,
      type: 'HEALTH_REPORT',
      timestamp: new Date().toISOString(),
      status: result.success ? 'SENT' : 'FAILED',
      summary: `Sistem Sağlık Raporu (${overallStatusText})`,
      error: result.error,
    });

    if (result.success) {
      await this.saveConfig({ lastHealthReportAt: new Date().toISOString() });
    }

    return {
      success: result.success,
      reportText: report,
      error: result.error,
    };
  }

  /**
   * Sends a test ping to verify Telegram Bot Token and Chat ID
   */
  public async sendTestMessage(
    testToken?: string,
    testChatId?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    const message = `🎉 <b>TEBRİKLER! TELEGRAM BİLDİRİM ENTEGRASYONU BAŞARILI</b>\n\n` +
      `✅ <b>Bağlantı:</b> Doğrulandı\n` +
      `⏰ <b>Test Zamanı:</b> ${timeStr}\n` +
      `🤖 <b>Bot Servisi:</b> Finansal İstihbarat & Sıfır Kesinti Uyarı Motoru\n\n` +
      `<i>Bu mesajı görüyorsanız; tüm kritik alarmlar, failover geçişleri ve periyodik sistem sağlığı raporları bu kanala anlık olarak iletilecektir.</i>`;

    const result = await this.sendMessage(message, {
      customToken: testToken,
      customChatId: testChatId,
    });

    this.recordDeliveryLog({
      id: `log_${Date.now()}`,
      type: 'TEST',
      timestamp: new Date().toISOString(),
      status: result.success ? 'SENT' : 'FAILED',
      summary: 'Telegram Test Ping Mesajı',
      error: result.error,
    });

    if (result.success) {
      return { success: true, message: 'Test bildirimi Telegram hesabınıza/kanalınıza başarıyla iletildi!' };
    } else {
      return { success: false, error: result.error || 'Test mesajı gönderilemedi.' };
    }
  }

  public getRecentLogs(): TelegramDeliveryLog[] {
    return [...this.deliveryLogs];
  }

  private recordDeliveryLog(log: TelegramDeliveryLog) {
    this.deliveryLogs.unshift(log);
    if (this.deliveryLogs.length > 50) {
      this.deliveryLogs.length = 50;
    }
  }

  private escapeHtml(text: string): string {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const telegramService = TelegramService.getInstance();
