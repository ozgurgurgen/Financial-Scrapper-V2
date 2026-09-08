import { db } from '../db/index.ts';
import { systemErrorLogs } from '../db/schema.ts';
import { desc, eq, and, gte, lte, ilike, or, count, sql } from 'drizzle-orm';
import { appEventBus, type DepartmentType, type EventStatus } from './AppEventBus.ts';

export type LogLevel = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogModule =
  | 'DATABASE'
  | 'API_GATEWAY'
  | 'YAHOO_BIST'
  | 'BINANCE_CRYPTO'
  | 'TCMB_EVDS'
  | 'TEFAS'
  | 'KAP'
  | 'SCHEDULER'
  | 'AI_SERVICE'
  | 'AUTH'
  | 'TELEGRAM'
  | 'CLIENT_UI'
  | 'BROWSER'
  | 'SYSTEM';

export interface LogEntryOptions {
  stackTrace?: string;
  requestPath?: string;
  requestMethod?: string;
  clientIp?: string;
  statusCode?: number;
  contextData?: Record<string, any>;
  skipDb?: boolean;
}

export interface SystemLogItem {
  id: number;
  level: LogLevel;
  module: LogModule;
  message: string;
  stackTrace?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  clientIp?: string | null;
  statusCode?: number | null;
  contextData?: Record<string, any> | null;
  isResolved: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  timestamp: Date;
}

export interface LogFilterParams {
  level?: LogLevel | 'ALL';
  module?: LogModule | 'ALL';
  search?: string;
  isResolved?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LogStats {
  totalLogs: number;
  fatalCount: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  unresolvedErrors: number;
  last24hCount: number;
  moduleBreakdown: Record<string, number>;
  levelBreakdown: Record<string, number>;
  hourlyDistribution: { hour: string; count: number }[];
}

class SystemLoggerService {
  private memoryBuffer: SystemLogItem[] = [];
  private readonly MAX_BUFFER_SIZE = 500;
  private isInitialized = false;
  private isHooked = false;
  private isInternalLogging = false;

  private originalConsoleError = console.error;
  private originalConsoleWarn = console.warn;

  constructor() {
    this.initProcessHandlers();
    this.hookConsole();
  }

  private initProcessHandlers() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Unhandled Promise Rejection
    process.on('unhandledRejection', (reason: any) => {
      const msg = reason?.message || String(reason) || 'Unhandled Promise Rejection';
      const stack = reason?.stack || (typeof reason === 'object' ? JSON.stringify(reason) : undefined);
      this.error('SYSTEM', `Unhandled Rejection: ${msg}`, { stackTrace: stack });
    });

    // Uncaught Exception
    process.on('uncaughtException', (err: Error) => {
      this.fatal('SYSTEM', `Uncaught Exception: ${err.message}`, { stackTrace: err.stack });
    });
  }

  /**
   * Node.js Konsolundaki Tüm console.error ve console.warn çağrılarını yakalar
   */
  public hookConsole() {
    if (this.isHooked) return;
    this.isHooked = true;

    const self = this;

    console.error = function (...args: any[]) {
      self.originalConsoleError.apply(console, args);

      if (self.isInternalLogging) return;

      try {
        const fullMsg = args
          .map((a) => (a instanceof Error ? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');

        // Vite dev server websocket veya önemsiz çıktıları atla
        if (
          fullMsg.includes('failed to connect to websocket') ||
          fullMsg.includes('WebSocket closed without opened') ||
          fullMsg.includes('closed without opened') ||
          fullMsg.includes('[vite]') ||
          fullMsg.includes('[SystemLoggerService]')
        ) {
          return;
        }

        // Otomatik Modül Tespiti
        let mod: LogModule = 'SYSTEM';
        const lower = fullMsg.toLowerCase();
        if (lower.includes('postgres') || lower.includes('pg') || lower.includes('drizzle') || lower.includes('db')) mod = 'DATABASE';
        else if (lower.includes('tefas')) mod = 'TEFAS';
        else if (lower.includes('kap')) mod = 'KAP';
        else if (lower.includes('bist') || lower.includes('yahoo') || lower.includes('bigpara')) mod = 'YAHOO_BIST';
        else if (lower.includes('binance') || lower.includes('crypto')) mod = 'BINANCE_CRYPTO';
        else if (lower.includes('tcmb') || lower.includes('evds')) mod = 'TCMB_EVDS';
        else if (lower.includes('gemini') || lower.includes('ai')) mod = 'AI_SERVICE';
        else if (lower.includes('telegram')) mod = 'TELEGRAM';

        const errObj = args.find((a) => a instanceof Error);
        const stack = errObj?.stack;

        self.isInternalLogging = true;
        self.log('ERROR', mod, fullMsg.substring(0, 500), { stackTrace: stack }).finally(() => {
          self.isInternalLogging = false;
        });
      } catch {
        self.isInternalLogging = false;
      }
    };

    console.warn = function (...args: any[]) {
      self.originalConsoleWarn.apply(console, args);

      if (self.isInternalLogging) return;

      try {
        const fullMsg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');

        if (
          fullMsg.includes('failed to connect to websocket') ||
          fullMsg.includes('[vite]') ||
          fullMsg.includes('[SystemLoggerService]')
        ) {
          return;
        }

        let mod: LogModule = 'SYSTEM';
        const lower = fullMsg.toLowerCase();
        if (lower.includes('postgres') || lower.includes('drizzle') || lower.includes('db')) mod = 'DATABASE';
        else if (lower.includes('tefas')) mod = 'TEFAS';
        else if (lower.includes('kap')) mod = 'KAP';
        else if (lower.includes('bist') || lower.includes('yahoo')) mod = 'YAHOO_BIST';
        else if (lower.includes('binance')) mod = 'BINANCE_CRYPTO';
        else if (lower.includes('tcmb')) mod = 'TCMB_EVDS';

        self.isInternalLogging = true;
        self.log('WARN', mod, fullMsg.substring(0, 500)).finally(() => {
          self.isInternalLogging = false;
        });
      } catch {
        self.isInternalLogging = false;
      }
    };
  }

  /**
   * Ana Log Kayıt Fonksiyonu
   */
  public async log(
    level: LogLevel,
    module: LogModule,
    message: string,
    options?: LogEntryOptions
  ): Promise<SystemLogItem> {
    const timestamp = new Date();
    const cleanMessage = String(message || '').trim();

    // 1. Console renkli çıktı
    this.printToConsole(level, module, cleanMessage, options);

    // 2. Veritabanına Asenkron Kayıt
    let insertedId = Date.now();
    let dbRecord: any = null;

    if (!options?.skipDb) {
      try {
        const [inserted] = await db
          .insert(systemErrorLogs)
          .values({
            level,
            module,
            message: cleanMessage,
            stackTrace: options?.stackTrace || null,
            requestPath: options?.requestPath || null,
            requestMethod: options?.requestMethod || null,
            clientIp: options?.clientIp || null,
            statusCode: options?.statusCode || null,
            contextData: options?.contextData || null,
            isResolved: false,
            timestamp,
          })
          .returning();

        if (inserted) {
          insertedId = inserted.id;
          dbRecord = inserted;
        }
      } catch (dbErr: any) {
        console.warn('[SystemLoggerService] DB log write fallback:', dbErr.message);
      }
    }

    const item: SystemLogItem = dbRecord
      ? {
          id: dbRecord.id,
          level: dbRecord.level as LogLevel,
          module: dbRecord.module as LogModule,
          message: dbRecord.message,
          stackTrace: dbRecord.stackTrace,
          requestPath: dbRecord.requestPath,
          requestMethod: dbRecord.requestMethod,
          clientIp: dbRecord.clientIp,
          statusCode: dbRecord.statusCode,
          contextData: dbRecord.contextData as any,
          isResolved: dbRecord.isResolved,
          resolvedAt: dbRecord.resolvedAt,
          resolvedBy: dbRecord.resolvedBy,
          timestamp: dbRecord.timestamp,
        }
      : {
          id: insertedId,
          level,
          module,
          message: cleanMessage,
          stackTrace: options?.stackTrace || null,
          requestPath: options?.requestPath || null,
          requestMethod: options?.requestMethod || null,
          clientIp: options?.clientIp || null,
          statusCode: options?.statusCode || null,
          contextData: options?.contextData || null,
          isResolved: false,
          timestamp,
        };

    // 3. Hafıza Ring Bufferına Ekle
    this.memoryBuffer.unshift(item);
    if (this.memoryBuffer.length > this.MAX_BUFFER_SIZE) {
      this.memoryBuffer.pop();
    }

    // 4. Canlı Olay Akışına Yayınla
    try {
      const dept: DepartmentType = (module === 'YAHOO_BIST' || module === 'BINANCE_CRYPTO' || module === 'TEFAS') 
        ? 'BORSA' 
        : (module === 'KAP' ? 'KAP' : (module === 'TCMB_EVDS' ? 'MERKEZ_BANKASI' : 'ARSIV'));
      const status: EventStatus = (level === 'FATAL' || level === 'ERROR') ? 'ERROR' : 'SUCCESS';

      appEventBus.emitOfficeEvent({
        department: dept,
        actor: 'SYSTEM',
        type: level === 'ERROR' || level === 'FATAL' ? 'ERROR' : 'STATUS_UPDATE',
        status,
        detail: `[${level}] [${module}] ${cleanMessage.substring(0, 120)}`,
        payload: {
          logId: item.id,
          level,
          module,
          message: cleanMessage,
          timestamp: item.timestamp,
        },
      });
    } catch {
      // ignore
    }

    return item;
  }

  public fatal(module: LogModule, message: string, options?: LogEntryOptions) {
    return this.log('FATAL', module, message, options);
  }

  public error(module: LogModule, message: string, options?: LogEntryOptions) {
    return this.log('ERROR', module, message, options);
  }

  public warn(module: LogModule, message: string, options?: LogEntryOptions) {
    return this.log('WARN', module, message, options);
  }

  public info(module: LogModule, message: string, options?: LogEntryOptions) {
    return this.log('INFO', module, message, options);
  }

  public debug(module: LogModule, message: string, options?: LogEntryOptions) {
    return this.log('DEBUG', module, message, options);
  }

  private printToConsole(level: LogLevel, module: LogModule, message: string, options?: LogEntryOptions) {
    const timeStr = new Date().toLocaleTimeString('tr-TR');
    const prefix = `[${timeStr}] [${level}] [${module}]`;

    switch (level) {
      case 'FATAL':
        this.originalConsoleError('\x1b[41m\x1b[37m%s\x1b[0m %s', prefix, message);
        if (options?.stackTrace) this.originalConsoleError(options.stackTrace);
        break;
      case 'ERROR':
        this.originalConsoleError('\x1b[31m%s\x1b[0m %s', prefix, message);
        if (options?.stackTrace) this.originalConsoleError(options.stackTrace);
        break;
      case 'WARN':
        this.originalConsoleWarn('\x1b[33m%s\x1b[0m %s', prefix, message);
        break;
      case 'INFO':
        console.info('\x1b[36m%s\x1b[0m %s', prefix, message);
        break;
      case 'DEBUG':
        console.debug('\x1b[90m%s\x1b[0m %s', prefix, message);
        break;
    }
  }

  /**
   * Logları Filtreleme ve Sayfalama ile Getir
   */
  public async getLogs(params: LogFilterParams = {}): Promise<{
    logs: SystemLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(200, Math.max(1, Number(params.limit || 50)));
    const offset = (page - 1) * limit;

    try {
      const conditions: any[] = [];

      if (params.level && params.level !== 'ALL') {
        conditions.push(eq(systemErrorLogs.level, params.level));
      }

      if (params.module && params.module !== 'ALL') {
        conditions.push(eq(systemErrorLogs.module, params.module));
      }

      if (params.isResolved !== undefined) {
        conditions.push(eq(systemErrorLogs.isResolved, params.isResolved));
      }

      if (params.startDate) {
        conditions.push(gte(systemErrorLogs.timestamp, new Date(params.startDate)));
      }

      if (params.endDate) {
        conditions.push(lte(systemErrorLogs.timestamp, new Date(params.endDate)));
      }

      if (params.search && params.search.trim()) {
        const searchPattern = `%${params.search.trim()}%`;
        conditions.push(
          or(
            ilike(systemErrorLogs.message, searchPattern),
            ilike(systemErrorLogs.requestPath, searchPattern),
            ilike(systemErrorLogs.module, searchPattern)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total count
      const totalResult = await db
        .select({ value: count() })
        .from(systemErrorLogs)
        .where(whereClause);
      const total = Number(totalResult[0]?.value || 0);

      // Logs
      const rows = await db
        .select()
        .from(systemErrorLogs)
        .where(whereClause)
        .orderBy(desc(systemErrorLogs.timestamp))
        .limit(limit)
        .offset(offset);

      const logs: SystemLogItem[] = rows.map((r) => ({
        id: r.id,
        level: r.level as LogLevel,
        module: r.module as LogModule,
        message: r.message,
        stackTrace: r.stackTrace,
        requestPath: r.requestPath,
        requestMethod: r.requestMethod,
        clientIp: r.clientIp,
        statusCode: r.statusCode,
        contextData: r.contextData as any,
        isResolved: r.isResolved,
        resolvedAt: r.resolvedAt,
        resolvedBy: r.resolvedBy,
        timestamp: r.timestamp,
      }));

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch (e: any) {
      console.warn('[SystemLoggerService] getLogs DB fallback to memory buffer:', e.message);
      // Fallback to memory
      let filtered = [...this.memoryBuffer];
      if (params.level && params.level !== 'ALL') {
        filtered = filtered.filter((l) => l.level === params.level);
      }
      if (params.module && params.module !== 'ALL') {
        filtered = filtered.filter((l) => l.module === params.module);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((l) => l.message.toLowerCase().includes(s));
      }
      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      return {
        logs: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }
  }

  /**
   * Log İstatistikleri ve Özet Metrikler
   */
  public async getStats(): Promise<LogStats> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const allRows = await db.select().from(systemErrorLogs);

      let fatalCount = 0;
      let errorCount = 0;
      let warnCount = 0;
      let infoCount = 0;
      let unresolvedErrors = 0;
      let last24hCount = 0;
      const moduleBreakdown: Record<string, number> = {};
      const levelBreakdown: Record<string, number> = {};

      // 24 saatlik saat dilimi haritası
      const hourlyMap: Record<string, number> = {};
      for (let i = 23; i >= 0; i--) {
        const d = new Date(Date.now() - i * 60 * 60 * 1000);
        const hourKey = `${String(d.getHours()).padStart(2, '0')}:00`;
        hourlyMap[hourKey] = 0;
      }

      for (const row of allRows) {
        const lvl = row.level;
        levelBreakdown[lvl] = (levelBreakdown[lvl] || 0) + 1;
        moduleBreakdown[row.module] = (moduleBreakdown[row.module] || 0) + 1;

        if (lvl === 'FATAL') fatalCount++;
        else if (lvl === 'ERROR') errorCount++;
        else if (lvl === 'WARN') warnCount++;
        else if (lvl === 'INFO') infoCount++;

        if ((lvl === 'FATAL' || lvl === 'ERROR') && !row.isResolved) {
          unresolvedErrors++;
        }

        if (row.timestamp >= oneDayAgo) {
          last24hCount++;
          const hourKey = `${String(new Date(row.timestamp).getHours()).padStart(2, '0')}:00`;
          if (hourlyMap[hourKey] !== undefined) {
            hourlyMap[hourKey]++;
          }
        }
      }

      const hourlyDistribution = Object.entries(hourlyMap).map(([hour, count]) => ({
        hour,
        count,
      }));

      return {
        totalLogs: allRows.length,
        fatalCount,
        errorCount,
        warnCount,
        infoCount,
        unresolvedErrors,
        last24hCount,
        moduleBreakdown,
        levelBreakdown,
        hourlyDistribution,
      };
    } catch (e: any) {
      console.warn('[SystemLoggerService] getStats fallback to memory buffer:', e.message);
      return {
        totalLogs: this.memoryBuffer.length,
        fatalCount: this.memoryBuffer.filter((l) => l.level === 'FATAL').length,
        errorCount: this.memoryBuffer.filter((l) => l.level === 'ERROR').length,
        warnCount: this.memoryBuffer.filter((l) => l.level === 'WARN').length,
        infoCount: this.memoryBuffer.filter((l) => l.level === 'INFO').length,
        unresolvedErrors: this.memoryBuffer.filter((l) => (l.level === 'FATAL' || l.level === 'ERROR') && !l.isResolved).length,
        last24hCount: this.memoryBuffer.length,
        moduleBreakdown: {},
        levelBreakdown: {},
        hourlyDistribution: [],
      };
    }
  }

  /**
   * Hatayı Çözüldü Olarak İşaretle
   */
  public async resolveLog(id: number, resolvedBy: string = 'Admin'): Promise<boolean> {
    try {
      await db
        .update(systemErrorLogs)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy,
        })
        .where(eq(systemErrorLogs.id, id));

      const memItem = this.memoryBuffer.find((l) => l.id === id);
      if (memItem) {
        memItem.isResolved = true;
        memItem.resolvedAt = new Date();
        memItem.resolvedBy = resolvedBy;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Tüm Logları veya Belirli Tarihten Öncesini Temizle
   */
  public async clearLogs(beforeDate?: string): Promise<{ deletedCount: number }> {
    try {
      if (beforeDate) {
        const d = new Date(beforeDate);
        await db.delete(systemErrorLogs).where(lte(systemErrorLogs.timestamp, d));
        this.memoryBuffer = this.memoryBuffer.filter((l) => l.timestamp > d);
      } else {
        await db.delete(systemErrorLogs);
        this.memoryBuffer = [];
      }
      return { deletedCount: 1 };
    } catch (e: any) {
      this.memoryBuffer = [];
      return { deletedCount: 0 };
    }
  }

  /**
   * Logları Dışa Aktar (JSON veya CSV)
   */
  public async exportLogs(format: 'json' | 'csv' = 'json', params: LogFilterParams = {}): Promise<string> {
    const { logs } = await this.getLogs({ ...params, limit: 1000, page: 1 });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = ['ID', 'Tarih', 'Seviye', 'Modül', 'Mesaj', 'İstek Yolu', 'Durum Kodu', 'Çözüldü mü', 'Çözen'];
    const rows = logs.map((l) => [
      l.id,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.level}"`,
      `"${l.module}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      `"${l.requestPath || ''}"`,
      l.statusCode || '',
      l.isResolved ? 'EVET' : 'HAYIR',
      `"${l.resolvedBy || ''}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const systemLogger = new SystemLoggerService();
