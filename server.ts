import express from 'express';
import path from 'path';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { fetchAndStoreYahooData, getStocks } from './src/db/stocks.ts';
import { fetchAndStoreMacroData, getMacroData } from './src/db/macro.ts';
import { createServer as createViteServer } from 'vite';

// New Multi-Source Sync Imports
import * as cron from 'node-cron';
import { syncManager } from './src/services/SyncManager.ts';
import { YahooAdapter } from './src/services/YahooAdapter.ts';
import { TCMBAdapter } from './src/services/TCMBAdapter.ts';
import { FREDAdapter } from './src/services/FREDAdapter.ts';
import { KAPAdapter } from './src/services/KAPAdapter.ts';
import { TEFASAdapter, tefasAdapter } from './src/services/TEFASAdapter.ts';
import { CryptoAdapter } from './src/services/CryptoAdapter.ts';
import { cryptoService } from './src/services/CryptoService.ts';
import { marketService } from './src/services/MarketService.ts';
import { aiService } from './src/services/AIService.ts';
import { multiLLMService } from './src/services/MultiLLMService.ts';
import { fiveYearSyncService } from './src/services/FiveYearSyncService.ts';
import { bistUniverseService } from './src/services/BistUniverseService.ts';
import { usUniverseService } from './src/services/UsUniverseService.ts';
import { publicApiService } from './src/services/PublicApiService.ts';
import { automatedSchedulerService } from './src/services/AutomatedSchedulerService.ts';
import { kapFundScraperService } from './src/services/KAPFundScraperService.ts';
import { kapCompanyService } from './src/services/KapCompanyService.ts';
import { appEventBus } from './src/services/AppEventBus.ts';
import { systemLogger } from './src/services/SystemLoggerService.ts';
import { databaseAnalyticsService } from './src/services/DatabaseAnalyticsService.ts';
import { db, switchDatabase, syncFromCloudToLocal, syncFromLocalToCloud, syncBidirectional, ensureDatabaseConnected } from './src/db/index.ts';
import { 
  settings, assets, assetMappings, assetData, syncLogs, 
  kapDisclosures, tefasFunds, tefasPrices, bistStocks 
} from './src/db/schema.ts';
import { eq, desc, ilike, or, sql } from 'drizzle-orm';
import { zeroDowntimeEngine } from './src/services/ZeroDowntimeEngine.ts';
import { circuitBreakerRegistry } from './src/services/CircuitBreaker.ts';
import { proxyChainService } from './src/services/ProxyChainService.ts';
import { offlineRingBuffer } from './src/services/OfflineRingBuffer.ts';
import { selfHealingSchemaParser } from './src/services/SelfHealingSchemaParser.ts';
import { dataSourceHealthService } from './src/services/DataSourceHealthService.ts';
import { telegramService } from './src/services/TelegramService.ts';
import { apiTelemetryService } from './src/services/ApiTelemetryService.ts';
import { comprehensiveDataService } from './src/services/ComprehensiveDataIntegrationService.ts';

// Register Adapters
syncManager.registerAdapter(new YahooAdapter());
syncManager.registerAdapter(new TCMBAdapter());
syncManager.registerAdapter(new FREDAdapter());
syncManager.registerAdapter(new KAPAdapter());
syncManager.registerAdapter(new TEFASAdapter());
syncManager.registerAdapter(new CryptoAdapter());

// Map of active cron jobs
const activeJobs: Record<string, cron.ScheduledTask> = {};

// Helper to schedule jobs based on DB settings
async function scheduleSyncJobs() {
  const sources = ['YAHOO', 'TCMB', 'FRED', 'KAP', 'TEFAS'];

  
  for (const source of sources) {
    // Clean up existing job
    if (activeJobs[source]) {
      activeJobs[source].stop();
    }
    
    // Check if enabled and get cron expression
    const settingRec = await db.select().from(settings).where(eq(settings.key, `sync_settings_${source}`)).limit(1);
    
    let isEnabled = true;
    let cronExpr = '0 * * * *'; // Default 1 hour
    
    if (settingRec.length > 0) {
      const val = settingRec[0].value as any;
      isEnabled = val.enabled ?? true;
      cronExpr = val.cron || cronExpr;
    }
    
    if (isEnabled && cron.validate(cronExpr)) {
      console.log(`Scheduling ${source} sync job with cron: ${cronExpr}`);
      activeJobs[source] = cron.schedule(cronExpr, async () => {
        console.log(`Running scheduled sync for ${source}`);
        await syncManager.triggerSync(source);
      });
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware for external web and mobile clients
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // --- GLOBAL API TELEMETRY & DIAGNOSTICS MIDDLEWARE ---
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      return next();
    }

    // Check maintenance mode for external API callers
    const masterStatus = apiTelemetryService.getMasterStatus();
    if (masterStatus === 'MAINTENANCE' && !req.path.startsWith('/api/v1/admin/')) {
      return res.status(503).json({
        success: false,
        error: 'API şu anda BAKIM MODUNDA (Maintenance Mode). Lütfen daha sonra tekrar deneyiniz.',
        status: masterStatus,
        timestamp: new Date().toISOString()
      });
    }

    const startTime = performance.now();
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const rawApiKey = (req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.query.api_key) as string;

    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, callback?: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'API-Client';

      apiTelemetryService.recordRequest({
        id: requestId,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: durationMs,
        ip: clientIp,
        userAgent: userAgent.substring(0, 100),
        apiKeyName: rawApiKey || 'Genel İstemci'
      });

      // Automatically capture API errors and slow requests to system error logs
      if (res.statusCode >= 500) {
        systemLogger.error('API_GATEWAY', `${req.method} ${req.originalUrl || req.url} -> HTTP ${res.statusCode} Sunucu Hatası`, {
          requestPath: req.originalUrl || req.url,
          requestMethod: req.method,
          clientIp,
          statusCode: res.statusCode,
          contextData: { durationMs, userAgent }
        }).catch(() => {});
      } else if (durationMs > 5000 && !req.path.includes('/stream') && !req.path.includes('/events')) {
        systemLogger.warn('API_GATEWAY', `Yavaş API Yanıtı (${durationMs}ms): ${req.method} ${req.originalUrl || req.url}`, {
          requestPath: req.originalUrl || req.url,
          requestMethod: req.method,
          clientIp,
          statusCode: res.statusCode,
          contextData: { durationMs }
        }).catch(() => {});
      }

      return (originalEnd as any).apply(res, arguments);
    };

    next();
  });

  // --- API Routes ---

  // --- KAPSAMLI SİSTEM & HATA LOGLAMA UÇ NOKTALARI (SYSTEM & ERROR LOGS) ---
  app.get('/api/logs', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { level, module, search, isResolved, startDate, endDate, page, limit } = req.query;
      const result = await systemLogger.getLogs({
        level: level as any,
        module: module as any,
        search: search as string,
        isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/logs/stats', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const stats = await systemLogger.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/logs/resolve/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const resolvedBy = req.body?.resolvedBy || req.user?.email || 'Admin';
      const success = await systemLogger.resolveLog(id, resolvedBy);
      res.json({ success, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/logs/clear', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const beforeDate = req.body?.beforeDate;
      const result = await systemLogger.clearLogs(beforeDate);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/logs/export', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const { level, module, search } = req.query;
      const output = await systemLogger.exportLogs(format, {
        level: level as any,
        module: module as any,
        search: search as string,
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="sistem_hatalari_${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(output);
      } else {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="sistem_hatalari_${new Date().toISOString().slice(0, 10)}.json"`);
        return res.send(output);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/logs/test', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const level = req.body?.level || 'WARN';
      const module = req.body?.module || 'SYSTEM';
      const message = req.body?.message || 'Manuel test log kaydı başarıyla oluşturuldu.';
      const item = await systemLogger.log(level, module, message, {
        requestPath: req.originalUrl,
        requestMethod: req.method,
        clientIp: req.ip,
        contextData: { trigger: 'Manual Test API', createdBy: req.user?.email || 'Admin' }
      });
      res.json({ success: true, item });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // İstemci / Tarayıcı (React UI, Browser Console) Hatalarını Yakalama Uç Noktası
  app.post('/api/logs/client', async (req, res) => {
    try {
      const { level = 'ERROR', module = 'CLIENT_UI', message, stackTrace, contextData } = req.body || {};
      if (!message) {
        return res.status(400).json({ success: false, error: 'Mesaj alanı zorunludur' });
      }

      // Vite dev server websocket veya önemsiz çıktıları atla
      const lowerMsg = String(message).toLowerCase();
      if (
        lowerMsg.includes('websocket') ||
        lowerMsg.includes('closed without opened') ||
        lowerMsg.includes('failed to connect to websocket') ||
        lowerMsg.includes('[vite]')
      ) {
        return res.json({ success: true, ignored: true });
      }

      const item = await systemLogger.log(level, module, message, {
        stackTrace,
        requestPath: contextData?.url || '/ui',
        requestMethod: 'CLIENT_EVENT',
        clientIp: req.ip,
        contextData: {
          ...contextData,
          reportedFrom: 'Frontend Browser Bridge',
        }
      });
      res.json({ success: true, id: item.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Public health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Authenticate user and register in database
  app.post('/api/auth/login', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      const user = await getOrCreateUser(req.user.uid, req.user.email || '');
      res.json({ user });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message || 'Login failed' });
    }
  });

  // Sync Yahoo Finance data
  app.post('/api/stocks/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const result = await fetchAndStoreYahooData();
      res.json(result);
    } catch (error: any) {
      console.error('Sync error:', error);
      res.status(500).json({ error: error.message || 'Sync failed' });
    }
  });

  // Get BIST stocks
  app.get('/api/stocks', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const stocks = await getStocks();
      res.json(stocks);
    } catch (error: any) {
      console.error('Fetch stocks error:', error);
      res.status(500).json({ error: error.message || 'Fetch failed' });
    }
  });

  // Sync Macro Data
  app.post('/api/macro/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const result = await fetchAndStoreMacroData();
      res.json(result);
    } catch (error: any) {
      console.error('Macro sync error:', error);
      res.status(500).json({ error: error.message || 'Macro sync failed' });
    }
  });

  // Get Macro Data
  app.get('/api/macro', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getMacroData();
      res.json(data);
    } catch (error: any) {
      console.error('Fetch macro error:', error);
      res.status(500).json({ error: error.message || 'Fetch failed' });
    }
  });

  // --- NEW MULTI-SOURCE SYNC ENDPOINTS ---

  // Manual trigger for a specific adapter
  app.post('/api/sync/trigger/:source', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const source = req.params.source.toUpperCase();
      const result = await syncManager.triggerSync(source);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get aggregated asset data
  app.get('/api/assets/:code/aggregated-data', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const code = req.params.code;
      // Get the asset
      const assetRecs = await db.select().from(assets).where(eq(assets.code, code)).limit(1);
      if (assetRecs.length === 0) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      const asset = assetRecs[0];

      // Get mappings
      const mappings = await db.select().from(assetMappings).where(eq(assetMappings.assetId, asset.id));

      // Get the latest data for each source mapped to this asset
      const unifiedData = await db.select().from(assetData)
        .where(eq(assetData.assetId, asset.id))
        .orderBy(desc(assetData.timestamp))
        .limit(20); // Last 20 data points

      res.json({
        asset,
        mappings,
        data: unifiedData
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // KAP Company Direct URL & Redirection (prevents 404s for all BIST tickers)
  app.get('/api/kap/company-redirect/:code', (req, res) => {
    const code = req.params.code;
    const targetUrl = kapCompanyService.getKapCompanyUrl(code);
    res.redirect(302, targetUrl);
  });

  app.get('/api/kap/company-url/:code', (req, res) => {
    const code = req.params.code;
    const targetUrl = kapCompanyService.getKapCompanyUrl(code);
    res.json({ success: true, code, url: targetUrl });
  });

  // Get KAP Disclosures
  app.get('/api/kap/disclosures', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const disclosures = await db.select().from(kapDisclosures).orderBy(desc(kapDisclosures.publishDate)).limit(100);
      res.json(disclosures);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // On-demand AI Summarization for a KAP disclosure
  app.post('/api/kap/summarize/:index', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const index = req.params.index;
      const records = await db.select().from(kapDisclosures).where(eq(kapDisclosures.disclosureIndex, index)).limit(1);
      if (records.length === 0) {
        return res.status(404).json({ error: 'Bildirim bulunamadı' });
      }

      const item = records[0];
      const summary = await aiService.analyzeCompanyDisclosure({
        symbol: item.symbol || undefined,
        companyTitle: item.companyName || undefined,
        title: item.title,
        fullText: item.fullText || item.title,
        category: item.category || undefined,
        force: true
      });

      if (summary) {
        await db.update(kapDisclosures)
          .set({ summary })
          .where(eq(kapDisclosures.disclosureIndex, index));
      }

      res.json({ success: true, summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test AI Connection (Multi-provider LLM)
  app.post('/api/ai/test', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const result = await aiService.testConnection(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get Active AI Configuration (Selected provider and model from Settings)
  app.get('/api/ai/active-config', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { multiLLMService } = await import('./src/services/MultiLLMService.ts');
      const config = await multiLLMService.getActiveConfig();
      const providerLabels: Record<string, string> = {
        gemini: 'Google Gemini',
        openai: 'OpenAI',
        anthropic: 'Anthropic Claude',
        deepseek: 'DeepSeek',
        groq: 'Groq (Llama)',
        openrouter: 'OpenRouter',
        local: 'Yerel Ollama',
        '9router': '9router Proxy',
        custom: 'Özel LLM'
      };
      const label = `${providerLabels[config.provider] || config.provider.toUpperCase()} (${config.model || 'Varsayılan'})`;
      res.json({
        success: true,
        provider: config.provider,
        model: config.model,
        label,
        shortLabel: providerLabels[config.provider] || config.provider.toUpperCase()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get TEFAS Funds (Comprehensive)
  app.get('/api/tefas/funds', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const funds = await db
        .select({
          id: tefasFunds.id,
          code: tefasFunds.code,
          name: tefasFunds.name,
          type: tefasFunds.type,
          buyValour: tefasFunds.buyValour,
          sellValour: tefasFunds.sellValour,
          tradingHours: tefasFunds.tradingHours,
          managementFee: tefasFunds.managementFee,
          riskValue: tefasFunds.riskValue,
          isinCode: tefasFunds.isinCode,
          kapLink: tefasFunds.kapLink,
          minBuy: tefasFunds.minBuy,
          minSell: tefasFunds.minSell,
          tefasStatus: tefasFunds.tefasStatus,
          price: tefasPrices.price,
          dailyChange: tefasPrices.dailyChange,
          marketCap: tefasPrices.marketCap,
          shares: tefasPrices.shares,
          investorCount: tefasPrices.investorCount,
          marketShare: tefasPrices.marketShare,
          volume: tefasPrices.volume,
          categoryRank: tefasPrices.categoryRank,
          categoryTotal: tefasPrices.categoryTotal,
          date: tefasPrices.date,
          return1W: tefasPrices.return1W,
          return1M: tefasPrices.return1M,
          return3M: tefasPrices.return3M,
          return6M: tefasPrices.return6M,
          return1Y: tefasPrices.return1Y,
          return3Y: tefasPrices.return3Y,
          return5Y: tefasPrices.return5Y,
          returnYTD: tefasPrices.returnYTD,
          assetAllocation: tefasPrices.assetAllocation,
          benchmarkComparison: tefasPrices.benchmarkComparison
        })
        .from(tefasFunds)
        .leftJoin(tefasPrices, eq(tefasFunds.id, tefasPrices.fundId));

      const fundMap = new Map<number, any>();
      for (const row of funds) {
        if (!fundMap.has(row.id) || (row.date && (!fundMap.get(row.id).date || new Date(row.date) > new Date(fundMap.get(row.id).date)))) {
          fundMap.set(row.id, row);
        }
      }
      res.json(Array.from(fundMap.values()));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get or On-Demand Live Scrape single TEFAS Fund
  app.get('/api/tefas/fund/:code', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const code = req.params.code.trim().toUpperCase();
      
      // Check existing fund in DB
      const existing = await db
        .select()
        .from(tefasFunds)
        .where(eq(tefasFunds.code, code))
        .limit(1);

      let priceRecord: any = null;
      if (existing.length > 0) {
        const prices = await db
          .select()
          .from(tefasPrices)
          .where(eq(tefasPrices.fundId, existing[0].id))
          .orderBy(desc(tefasPrices.date))
          .limit(1);
        if (prices.length > 0) {
          priceRecord = prices[0];
        }
      }

      // If missing, or price is null, or query param force=true, scrape live!
      if (!priceRecord || !priceRecord.price || req.query.force === 'true') {
        const scraped = await tefasAdapter.scrapeFundDetails(code);
        if (scraped) {
          return res.json(scraped);
        }
      }

      if (existing.length > 0) {
        return res.json({
          ...existing[0],
          ...priceRecord
        });
      }

      res.status(404).json({ error: 'Fon bulunamadı' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Force Live Re-Scrape of a specific fund from TEFAS + KAP
  app.post('/api/tefas/scrape/:code', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const code = req.params.code.trim().toUpperCase();
      const result = await tefasAdapter.scrapeFundDetails(code);
      if (!result) {
        return res.status(500).json({ error: 'Fon verisi TEFAS veya KAP üzerinden kazınamadı' });
      }
      res.json({ success: true, fund: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Full TEFAS Sync
  app.post('/api/tefas/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const result = await tefasAdapter.sync();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- KRİPTO & ON-CHAIN DELTA SYNC API ENDPOINTS ---

  // Genel Özet ve API Tasarruf İstatistikleri
  app.get('/api/crypto/overview', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const overview = await cryptoService.getSyncOverview();
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Canlı Fiyatlar (Toplu / Smart Cache Delta)
  app.get('/api/crypto/prices', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const force = req.query.force === 'true';
      const prices = await cryptoService.getLivePrices(force);
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tarihsel Mumlar (OHLCV) ve Kod İçi Hesaplanmış İndikatörler (RSI, MACD)
  app.get('/api/crypto/candles/:symbol', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const timeframe = (req.query.timeframe as '15m' | '1h' | '1d') || '15m';
      const force = req.query.force === 'true';
      const candles = await cryptoService.getCandles(symbol, timeframe, force);
      res.json(candles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // On-Chain Sinyaller (IntoTheBlock - 12 saatte 1 kez çekilir)
  app.get('/api/crypto/onchain/:symbol', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const force = req.query.force === 'true';
      const onchain = await cryptoService.getOnChainSignals(symbol, force);
      res.json(onchain);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Kripto Haber Akışı & Duyarlılık (Sentiment)
  app.get('/api/crypto/news', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const force = req.query.force === 'true';
      const news = await cryptoService.getNews(force);
      res.json(news);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Genel Finans & Piyasa Haberleri (Kategorize BIST, Makro, Global, Kripto, Halka Arz)
  app.get('/api/news', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { newsAggregatorService } = await import('./src/services/NewsAggregatorService.ts');
      const category = (req.query.category as string) || 'ALL';
      const sentiment = (req.query.sentiment as string) || 'ALL';
      const search = (req.query.search as string) || '';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const force = req.query.force === 'true';

      if (force) {
        await newsAggregatorService.refreshAllNews();
      }

      const result = await newsAggregatorService.getAggregatedNews({
        category,
        sentiment,
        search,
        limit
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('Error in /api/news:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/news/refresh', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { newsAggregatorService } = await import('./src/services/NewsAggregatorService.ts');
      const result = await newsAggregatorService.refreshAllNews();
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error('Error in /api/news/refresh:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get News Retention & Category Limit Settings
  app.get('/api/news/settings', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { newsAggregatorService } = await import('./src/services/NewsAggregatorService.ts');
      const current = await newsAggregatorService.getNewsSettings();
      res.json({ success: true, settings: current });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update News Retention & Category Limit Settings
  app.post('/api/news/settings', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { newsAggregatorService } = await import('./src/services/NewsAggregatorService.ts');
      const updated = await newsAggregatorService.saveNewsSettings(req.body);
      res.json({ success: true, settings: updated, message: 'Haber ayarları kaydedildi ve eski kayıtlar arşivlendi.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Trigger manual news cleanup / pruning
  app.post('/api/news/prune', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { newsAggregatorService } = await import('./src/services/NewsAggregatorService.ts');
      const result = await newsAggregatorService.pruneExcessNews();
      res.json({ success: true, prunedCount: result.prunedCount, message: `${result.prunedCount} eski haber temizlendi.` });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Data Source Health Check, Auto-Failover & Discovery APIs
  app.get('/api/sources/health', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const forceAuto = req.query.autoFailover === 'true' ? true : req.query.autoFailover === 'false' ? false : undefined;
      const result = await dataSourceHealthService.checkAllSourcesHealth(forceAuto);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sources/auto-failover', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const result = await dataSourceHealthService.checkAllSourcesHealth(true);
      res.json({
        success: true,
        statuses: result.statuses,
        failoverActions: result.failoverActions,
        message: result.failoverActions.length > 0
          ? `${result.failoverActions.length} kesintili kaynak için otomatik failover başarıyla gerçekleştirildi.`
          : 'Tüm kaynaklar sağlıklı veya failover gerektiren kesinti bulunamadı.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/sources/failover-logs', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const logs = await dataSourceHealthService.getFailoverLogs();
      const autoFailoverEnabled = await dataSourceHealthService.isAutoFailoverEnabled();
      res.json({ success: true, logs, autoFailoverEnabled });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sources/toggle-auto-failover', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const { enabled } = req.body;
      const updated = await dataSourceHealthService.setAutoFailoverEnabled(Boolean(enabled));
      res.json({ success: true, autoFailoverEnabled: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sources/discover', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const { sourceId, customPrompt } = req.body;
      if (!sourceId) {
        return res.status(400).json({ success: false, error: 'sourceId zorunludur' });
      }
      const alternatives = await dataSourceHealthService.discoverAlternativeSources(sourceId, customPrompt);
      res.json({ success: true, alternatives });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sources/apply-override', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const { sourceId, newUrl } = req.body;
      const saved = await dataSourceHealthService.applySourceOverride(sourceId, newUrl);
      res.json({ success: true, overrides: saved, message: 'Yeni veri kaynağı onaylandı ve entegre edildi.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/sources/test-url', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { dataSourceHealthService } = await import('./src/services/DataSourceHealthService.ts');
      const { url } = req.body;
      const result = await dataSourceHealthService.testEndpoint(url);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Manuel Artımlı Güncelleme (Delta Sync Trigger)
  app.post('/api/crypto/sync-delta', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const symbol = (req.body.symbol || 'BTC').toUpperCase();
      const [prices, candles, onchain, news, overview] = await Promise.all([
        cryptoService.getLivePrices(true),
        cryptoService.getCandles(symbol, '15m', true),
        cryptoService.getOnChainSignals(symbol, false),
        cryptoService.getNews(false),
        cryptoService.getSyncOverview()
      ]);
      res.json({
        success: true,
        message: 'Artımlı delta senkronizasyonu tamamlandı ve veritabanına işlendi.',
        overview
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------------------------------------------------------------------------
  // CANLI PİYASA & ANALİZ UÇ NOKTALARI (100% Gerçek Veriler)
  // ----------------------------------------------------------------------------------
  app.get('/api/market/overview', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const data = await marketService.getLiveMarketOverview();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/market/technical/:ticker', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const ticker = req.params.ticker || 'THYAO';
      const period = (req.query.period as string) || '3A';
      const data = await marketService.getTechnicalAnalysis(ticker, period);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/market/screener', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const preset = (req.query.preset as string) || 'bullish_momentum';
      const data = await marketService.getScreenerData(preset);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/market/buffett', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const data = await marketService.getBuffettScores();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/market/calendar', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const data = marketService.getEconomicCalendar();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------------------------------------------------------------------------
  // ABD BORSALARI EN BÜYÜK 1.000 ŞİRKET (US TOP 1000 EQUITIES) API
  // ----------------------------------------------------------------------------------
  app.get('/api/v1/us-stocks', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { search, sector, sort, order, page, limit } = req.query;
      const result = await usUniverseService.getStocks({
        search: search as string,
        sector: sector as string,
        sort: sort as string,
        order: order as 'asc' | 'desc',
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/us-stocks/progress', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const progress = usUniverseService.getProgress();
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/us-stocks/:ticker', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const ticker = req.params.ticker;
      const stock = await usUniverseService.getStockByTicker(ticker);
      if (!stock) {
        return res.status(404).json({ error: `Stock ${ticker} not found` });
      }
      res.json(stock);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/us-stocks/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      // Fire async sync
      usUniverseService.syncAll1000Quotes().catch(err => {
        console.error('Background US stocks sync error:', err);
      });
      res.json({
        success: true,
        message: 'Amerikan Borsaları (Top 1.000 Şirket) senkronizasyonu arka planda başlatıldı.'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Settings Management
  app.get('/api/settings', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const allSettings = await db.select().from(settings);
      const settingsMap: Record<string, any> = {};
      allSettings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      res.json(settingsMap);
    } catch (error: any) {
      console.warn('[/api/settings] Error fetching settings, returning fallback:', error.message);
      res.json({
        app_name: { value: 'BIST & TEFAS Terminal' },
        app_logo: { value: '' }
      });
    }
  });

  app.post('/api/settings', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
      }
      
      await db.insert(settings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() }
        });
        
      // Re-schedule jobs if sync settings are updated
      if (key.startsWith('sync_settings_')) {
        await scheduleSyncJobs();
      }

      appEventBus.emitOfficeEvent({
        type: 'SETTINGS_UPDATED',
        actor: 'SYSTEM',
        department: 'ARSIV',
        status: 'SUCCESS',
        detail: `Sistem konfigürasyonu güncellendi: ${key}`,
        payload: { settingKey: key, value }
      });
        
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Servis Bağlantı Testi (Gemini, OpenAI, Anthropic, DeepSeek, Groq, OpenRouter, 9Router, Local)
  app.post('/api/ai/test', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const result = await aiService.testConnection(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'AI bağlantı testi başarısız oldu.' });
    }
  });

  // Dinamik Olarak Erişilebilir AI Modellerini Listeleme (9Router, Local Ollama, OpenAI, Groq vb.)
  app.post('/api/ai/models', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { provider, endpointUrl, apiKey } = req.body || {};
      const result = await multiLLMService.fetchAvailableModels({ provider, endpointUrl, apiKey });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, models: [], message: error.message || 'Modeller listelenemedi.' });
    }
  });

  // Veritabanı Değiştirme (Cloud <-> Local)
  app.post('/api/settings/db/switch', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const config = req.body;
      await switchDatabase(config);
      
      // Ayarı DB'ye de kaydet ki frontend bilsin (opsiyonel ama iyi olur)
      await db.insert(settings)
        .values({ key: 'db_connection_config', value: config, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: config, updatedAt: new Date() }
        });

      res.json({ success: true, message: 'Veritabanı bağlantısı başarıyla güncellendi.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DB Şema Oluşturma (Local için)
  app.post('/api/settings/db/init', optionalAuth, async (req: AuthRequest, res) => {
    try {
      // Executing drizzle-kit programmatically via child_process
      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);
      
      const config = req.body;
      const env = { ...process.env };
      if (config.connectionString) {
        env.DATABASE_URL = config.connectionString;
        delete env.SQL_HOST;
        delete env.SQL_USER;
        delete env.SQL_PASSWORD;
        delete env.SQL_DB_NAME;
        delete env.SQL_ADMIN_USER;
        delete env.SQL_ADMIN_PASSWORD;
      } else if (config.host) {
        delete env.DATABASE_URL;
        env.SQL_HOST = config.host;
        env.SQL_USER = config.user;
        env.SQL_PASSWORD = config.password;
        env.SQL_DB_NAME = config.database;
        env.SQL_ADMIN_USER = config.user;
        env.SQL_ADMIN_PASSWORD = config.password;
      }

      const { stdout, stderr } = await execPromise('npx drizzle-kit push --config=./src/db/drizzle.config.ts --force', { env });
      
      res.json({ success: true, message: 'Şema oluşturuldu/güncellendi.', output: stdout, errorOutput: stderr });
    } catch (error: any) {
      res.status(500).json({ error: error.message, details: error.stderr });
    }
  });

  // Veritabanı JSON Export / Import
  app.get('/api/settings/db/export', optionalAuth, async (req: AuthRequest, res) => {
    try {
      console.log('Export requested');
      const includeLargeHistory = req.query.includeLargeHistory === 'true';
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="database_backup.json"');
      res.flushHeaders();
      res.write('{');
      
      const { schema, ORDERED_TABLE_KEYS, MASSIVE_HISTORY_TABLES, defaultDb } = await import('./src/db/index.js');
      
      let firstTable = true;
      for (const tableKey of ORDERED_TABLE_KEYS) {
        if (MASSIVE_HISTORY_TABLES.has(tableKey) && !includeLargeHistory) continue;
        const table = (schema as any)[tableKey];
        if (!table) continue;
        
        console.log(`Exporting table: ${tableKey}`);
        
        let totalCount = 0;
        try {
          const { count } = await import('drizzle-orm');
          const countRes = await defaultDb.select({ value: count() }).from(table as any);
          totalCount = Number(countRes[0].value || 0);
        } catch (e: any) {
          console.error(`Count error on ${tableKey}:`, e);
          continue;
        }

        if (totalCount > 0) {
          if (!firstTable) res.write(',');
          firstTable = false;
          
          const tableName = table[Symbol.for('drizzle:Name')];
          res.write(`"${tableName}":[`);
          
          const limit = 5000;
          let exportedCount = 0;
          let firstRow = true;
          let lastId = 0;
          const hasId = 'id' in table;
          const { gt, asc } = await import('drizzle-orm');
          
          while (exportedCount < totalCount) {
            let chunk;
            if (hasId) {
              chunk = await defaultDb.select().from(table as any)
                .where(gt((table as any).id, lastId))
                .orderBy(asc((table as any).id))
                .limit(limit);
            } else {
              chunk = await defaultDb.select().from(table as any)
                .limit(limit).offset(exportedCount);
            }
            
            if (chunk.length === 0) break;
            
            if (hasId) {
              lastId = Number(chunk[chunk.length - 1].id) || 0;
            }
            
            const chunkStr = JSON.stringify(chunk, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            );
            
            // Remove the outer brackets [ ] from stringified array to stream inner objects
            const innerStr = chunkStr.substring(1, chunkStr.length - 1);
            
            if (innerStr.length > 0) {
              if (!firstRow) res.write(',');
              res.write(innerStr);
              firstRow = false;
            }
            
            exportedCount += chunk.length;
          }
          
          res.write(']');
          console.log(`Table ${tableKey} exported: ${totalCount} records`);
        }
      }
      
      res.write('}');
      res.end();
      console.log('Export response sent entirely.');
    } catch (error: any) {
      console.error('Export error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
        res.write(`,"ERROR_MSG":"${error.message}"}`);
        res.end();
      }
    }
  });

  app.post('/api/settings/db/import', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Geçersiz veri formatı. JSON nesnesi bekleniyor.' });
      }
      const { importDatabaseFromJson } = await import('./src/db/index.js');
      const result = await importDatabaseFromJson(data);
      res.json({ success: true, message: 'Veri içe aktarma tamamlandı.', ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Veritabanı Senkronizasyonu (Cloud -> Local, Local -> Cloud, Çift Yönlü)
  app.post('/api/settings/db/sync', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { 
        direction = 'cloud_to_local', 
        includeLargeHistory = false, 
        maxHistoryRowsPerTable, 
        batchSize,
        autoInitSchema = true 
      } = req.body || {};

      let result: any;
      let message = '';

      if (direction === 'local_to_cloud') {
        result = await syncFromLocalToCloud({ includeLargeHistory, maxHistoryRowsPerTable, batchSize, autoInitSchema });
        message = `Local veritabanından Cloud veritabanına toplam ${result.totalRows.toLocaleString('tr-TR')} satır başarıyla aktarıldı.`;
      } else if (direction === 'bidirectional') {
        result = await syncBidirectional({ includeLargeHistory, maxHistoryRowsPerTable, batchSize, autoInitSchema });
        message = `Çift yönlü senkronizasyon tamamlandı: Toplam ${result.totalRows.toLocaleString('tr-TR')} satır eşitlendi (Cloud ➔ Local: ${result.directionBreakdown?.cloudToLocal?.toLocaleString('tr-TR') || 0}, Local ➔ Cloud: ${result.directionBreakdown?.localToCloud?.toLocaleString('tr-TR') || 0}).`;
      } else {
        result = await syncFromCloudToLocal({ includeLargeHistory, maxHistoryRowsPerTable, batchSize, autoInitSchema });
        message = `Cloud veritabanından Local veritabanına toplam ${result.totalRows.toLocaleString('tr-TR')} satır başarıyla aktarıldı.`;
      }

      res.json({
        success: true,
        message,
        direction,
        totalRows: result.totalRows,
        tableStats: result.tableStats,
        errors: result.errors,
        directionBreakdown: result.directionBreakdown
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Sync Logs
  app.get('/api/sync/logs', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const logs = await db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(50);
      res.json(logs);
    } catch (error: any) {
      console.warn('[/api/sync/logs] Error fetching sync logs, returning fallback:', error.message);
      res.json([]);
    }
  });

  // -------------------------------------------------------------------------
  // VERİTABANI KULLANIM ORANLARI, TELEMETRİ & İŞLEM HAREKET GRAFİKLERİ
  // -------------------------------------------------------------------------
  app.get('/api/db/analytics', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const metrics = await databaseAnalyticsService.getDatabaseMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Veritabanı Metrikleri & İşlem Logları Dışa Aktarma (Export CSV / JSON / SQL)
  app.get('/api/db/export', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const format = (req.query.format as string || 'json').toLowerCase();
      const type = (req.query.type as string || 'all').toLowerCase();
      const metrics = await databaseAnalyticsService.getDatabaseMetrics();

      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');

      if (format === 'csv') {
        if (type === 'tables') {
          // Export table metrics CSV
          const headers = ['Tablo Adi', 'Kategori', 'Kayit Sayisi', 'Tahmini Boyut', 'Toplam Payi (%)', 'Aciklama'];
          const rows = metrics.tables.map(t => [
            `"${t.tableName}"`,
            `"${t.category}"`,
            t.rowCount,
            `"${t.sizeFormatted}"`,
            `%${t.percentOfTotal}`,
            `"${t.description.replace(/"/g, '""')}"`
          ].join(','));
          const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="veritabani_tablo_kullanim_${timestampStr}.csv"`);
          return res.send(csvContent);
        } else if (type === 'activity') {
          // Export sync activity history CSV
          const headers = ['Tarih', 'Etiket', 'Toplam Islenen Kayit', 'Basarili Islem', 'Hatali Islem', 'TEFAS Kayit', 'BIST Kayit', 'KAP Kayit', 'TCMB Kayit', 'Kripto Kayit', 'FRED Kayit'];
          const rows = metrics.activityTimeline.map(a => [
            `"${a.date}"`,
            `"${a.label}"`,
            a.totalRecords,
            a.successfulSyncs,
            a.failedSyncs,
            a.tefasRecords,
            a.bistRecords,
            a.kapRecords,
            a.tcmbRecords,
            a.cryptoRecords,
            a.fredRecords
          ].join(','));
          const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="veritabani_islem_hareketleri_${timestampStr}.csv"`);
          return res.send(csvContent);
        } else {
          // Complete combined summary CSV
          const summarySection = [
            '# VERITABANI OZETI',
            `Motor,"${metrics.summary.databaseEngine}"`,
            `Toplam Kayit,${metrics.summary.totalRows}`,
            `Toplam Boyut,"${metrics.summary.totalSizeFormatted}"`,
            `Tablo Sayisi,${metrics.summary.totalTables}`,
            `Onbellek Isabeti,${metrics.summary.cacheHitRatioPct}%`,
            `Depolama Kotasi,"${metrics.summary.storageQuotaMb} MB"`,
            `Kullanim Orani,${metrics.summary.storageUsagePct}%`,
            '',
            '# TABLO DETAYLARI',
            'Tablo Adi,Kategori,Kayit Sayisi,Boyut,Yuzde,Aciklama',
            ...metrics.tables.map(t => `"${t.tableName}","${t.category}",${t.rowCount},"${t.sizeFormatted}",%${t.percentOfTotal},"${t.description.replace(/"/g, '""')}"`)
          ].join('\n');
          const csvContent = '\uFEFF' + summarySection;

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="veritabani_tam_telemetri_${timestampStr}.csv"`);
          return res.send(csvContent);
        }
      }

      if (format === 'sql') {
        const sqlDump = `-- POSTGRESQL 16 VERİTABANI DDL & İSTATİSTİK RAPORU
-- Oluşturulma: ${new Date().toLocaleString('tr-TR')}
-- Toplam Kayıt: ${metrics.summary.totalRows.toLocaleString()} | Boyut: ${metrics.summary.totalSizeFormatted}

-- Tablo İstatistik Özeti
${metrics.tables.map(t => `-- ${t.tableName}: ${t.rowCount.toLocaleString()} satır (${t.sizeFormatted}, %${t.percentOfTotal})`).join('\n')}

SELECT pg_size_pretty(pg_database_size(current_database())) AS current_database_size;
`;
        res.setHeader('Content-Type', 'application/sql; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="veritabani_sema_ozet_${timestampStr}.sql"`);
        return res.send(sqlDump);
      }

      // Default JSON download
      res.setHeader('Content-Disposition', `attachment; filename="veritabani_telemetri_${timestampStr}.json"`);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------------------
  // 5 YILLIK DERİN SENKRONİZASYON (TAMAMEN GERÇEK VERİ - ASLA MOCK YOK)
  // -------------------------------------------------------------------------
  // 5 Yıllık Veri Çekimini Başlat
  app.post('/api/sync/deep-5y', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (fiveYearSyncService.isCurrentlySyncing()) {
        return res.status(409).json({ 
          status: 'RUNNING', 
          message: '5 yıllık derin senkronizasyon zaten arka planda çalışıyor.' 
        });
      }

      // Arka planda başlat
      fiveYearSyncService.runFiveYearDeepSync()
        .then(result => {
          console.log('[FiveYearSync] 5 Yıllık Senkronizasyon Başarıyla Tamamlandı:', result.message);
        })
        .catch(err => {
          console.error('[FiveYearSync] 5 Yıllık Senkronizasyon Hatası:', err);
        });

      res.json({
        status: 'STARTED',
        message: '5 yıllık derin senkronizasyon motoru başlatıldı. BIST, ABD, FX, Emtia, Kripto ve TEFAS için en az 5 yıllık gerçek veriler çekiliyor.',
        startedAt: new Date()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5 Yıllık Veritabanı Kapsama ve İlerleme Durumu
  app.get('/api/sync/deep-5y/status', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const status = await fiveYearSyncService.getDatabaseStatus();
      const isSyncing = fiveYearSyncService.isCurrentlySyncing();
      res.json({
        ...status,
        isSyncing
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5 Yıllık Veri Çekim Canlı İlerleme Günlükleri
  app.get('/api/sync/deep-5y/logs', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const logs = fiveYearSyncService.getProgressLogs();
      const isSyncing = fiveYearSyncService.isCurrentlySyncing();
      res.json({
        isSyncing,
        logs
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Modül Bazında Çekilen Veri ve İstatistik Dökümü
  app.get('/api/sync/modules-breakdown', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const breakdown = await fiveYearSyncService.getModulesBreakdown();
      res.json(breakdown);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------------------
  // 625+ BIST TÜM HİSSELERİ & EVRENİ SENKRONİZASYON UÇ NOKTALARI
  // -------------------------------------------------------------------------
  // 625+ BIST Hisselerinin Tamamını ve 5 Yıllık Verilerini Çekmeyi Başlat
  app.post('/api/bist/sync-all', optionalAuth, async (req: AuthRequest, res) => {
    try {
      if (bistUniverseService.getProgress().isSyncing) {
        return res.status(409).json({
          status: 'RUNNING',
          progress: bistUniverseService.getProgress(),
          message: 'Tüm BIST hisselerinin senkronizasyonu zaten arka planda çalışıyor.'
        });
      }

      // Arka planda başlat
      bistUniverseService.startBackgroundFullSync().catch(console.error);

      res.json({
        status: 'STARTED',
        message: 'KAP üzerinden 625+ BIST hissesinin tamamı, canlı fiyatları ve 5 yıllık tarihsel geçmişleri çekilmeye başlandı.',
        startedAt: new Date()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // BIST Evreni Senkronizasyon İlerleme Durumu
  app.get('/api/bist/status', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const progress = bistUniverseService.getProgress();
      const countRes = await db.select({ count: sql`count(*)` }).from(bistStocks);
      const totalStocksInDb = Number(countRes[0]?.count || 0);

      res.json({
        ...progress,
        totalStocksInDb
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tüm BIST Hisseleri Listesi (Arama, Filtreleme ve Sıralama Destekli)
  app.get('/api/bist/universe', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const search = (req.query.search as string || '').trim();
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 1000;
      
      let query = db.select().from(bistStocks);
      
      if (search) {
        const pattern = `%${search}%`;
        const stocks = await db.select().from(bistStocks)
          .where(or(ilike(bistStocks.ticker, pattern), ilike(bistStocks.companyName, pattern)))
          .orderBy(desc(bistStocks.marketCap))
          .limit(limit);
        return res.json(stocks);
      }

      const stocks = await db.select().from(bistStocks)
        .orderBy(desc(bistStocks.marketCap))
        .limit(limit);
      
      res.json(stocks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================================================================
  // PUBLIC REST API V1 (DIŞ UYGULAMALAR & CLIENTLER İÇİN HEADLESS REST API)
  // =========================================================================

  // 1. API & DB Sağlık ve İstatistik Durumu
  app.get('/api/v1/health', async (req, res) => {
    try {
      const health = await publicApiService.getDatabaseHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. OpenAPI 3.0 / Swagger JSON Şeması
  app.get('/api/v1/openapi.json', (req, res) => {
    res.json(publicApiService.getOpenApiSchema());
  });

  // 3. 625+ BIST Hisseleri (Arama, Sayfalama, Sıralama, F/K, Piyasa Değeri)
  app.get('/api/v1/bist/stocks', async (req, res) => {
    try {
      const result = await publicApiService.getBistStocks({
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        order: req.query.order as any
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Tekil BIST Hissesi Detayı
  app.get('/api/v1/bist/stock/:ticker', async (req, res) => {
    try {
      const result = await publicApiService.getBistStockDetail(req.params.ticker);
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. 5 Yıllık Günlük OHLCV Fiyat Serisi
  app.get('/api/v1/bist/stock/:ticker/history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 1500;
      const result = await publicApiService.getBistStockHistory(
        req.params.ticker,
        req.query.from as string,
        req.query.to as string,
        limit
      );
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. Hisse Teknik İndikatörleri (RSI, MACD, SMA20/50/200, Bollinger Bantları)
  app.get('/api/v1/bist/stock/:ticker/indicators', async (req, res) => {
    try {
      const result = await publicApiService.getStockTechnicalIndicators(req.params.ticker);
      if (!result.success) return res.status(400).json(result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. 1.063 TEFAS Fonları (Kategori, 5 Yıllık Getiriler, Varlık Dağılımı)
  app.get('/api/v1/tefas/funds', async (req, res) => {
    try {
      const result = await publicApiService.getTefasFunds({
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        search: req.query.search as string,
        category: req.query.category as string
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Tekil TEFAS Fon Detayı & Detaylı Varlık Dağılımı (% Hisse, % Tahvil vb.)
  app.get('/api/v1/tefas/fund/:code', async (req, res) => {
    try {
      const result = await publicApiService.getTefasFundDetail(req.params.code);
      if (!result.success) return res.status(404).json(result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.1. TEFAS Fonunun İçindeki Tekil Hisse Senetleri & Bireysel Varlıklar
  app.get('/api/v1/tefas/fund/:code/holdings', async (req, res) => {
    try {
      const result = await publicApiService.getFundHoldings(req.params.code);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.2. Ters Arama: Bu Hisseyi (Örn: THYAO) Hangi TEFAS Fonları, Yüzde Kaç Ağırlıkla Taşıyor?
  app.get('/api/v1/tefas/stock/:ticker/in-funds', async (req, res) => {
    try {
      const result = await publicApiService.getFundsHoldingStock(req.params.ticker);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.3. TEFAS Genelinde Fonlar Tarafından En Çok Taşınan Hisseler
  app.get('/api/v1/tefas/top-held-stocks', async (req, res) => {
    try {
      const result = await publicApiService.getTopStockExposureAcrossFunds();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.4. TEFAS Fonu 5 Yıllık Günlük Fiyat / NAV Zaman Serisi
  app.get('/api/v1/tefas/fund/:code/daily-history', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
      const result = await publicApiService.getFundDailyHistory(req.params.code, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.5. Akıllı Kesintili & Hafta Sonu Geçmiş Veri Aktarımı (Backfill) Durumu
  app.get('/api/v1/backfill/status', async (req, res) => {
    try {
      const result = await publicApiService.getBackfillStatus();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.6. Geçmiş Veri Aktarımı Başlat / Tetikle
  app.post('/api/v1/backfill/trigger', async (req, res) => {
    try {
      const task = (req.body?.task || req.query?.task || 'ALL') as any;
      const result = await publicApiService.triggerBackfill(task);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.7. KAP Üzerinden Fon Bilgilerini & Portföy Dağılım Raporlarını (PDR) Canlı Tara ve Eşleştir
  app.post('/api/v1/kap/funds/sync-and-match', async (req, res) => {
    try {
      const result = await kapFundScraperService.syncAndMatchAllFundsWithKAP();
      res.json({
        success: true,
        message: `${result.syncedFunds} adet fon KAP genel bilgileri ve resmi Portföy Dağılım Raporları (PDR) ile eşleştirildi.`,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.8. Tek Bir Fonun KAP Genel Bilgilerini Canlı Çek / Scrape Et
  app.get('/api/v1/kap/fund/:code/general-info', async (req, res) => {
    try {
      const result = await kapFundScraperService.scrapeFundGeneralInfoFromKAP(req.params.code);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8.9. KAP Canlı Portföy Dağılım Raporları (PDR) Akışını Çek
  app.get('/api/v1/kap/funds/pdr-disclosures', async (req, res) => {
    try {
      const fundCode = req.query.fundCode as string | undefined;
      const result = await kapFundScraperService.scrapeKAPFundDisclosuresAndPDR(fundCode);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. KAP Bildirimleri & Şirket Açıklamaları
  app.get('/api/v1/kap/disclosures', async (req, res) => {
    try {
      const result = await publicApiService.getKapDisclosures({
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 30,
        ticker: req.query.ticker as string
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 10. Halka Arz (IPO) API endpointleri
  app.get('/api/v1/ipos', async (req, res) => {
    try {
      const result = await publicApiService.getIpos();
      res.json({ ...result, debug: "test1234" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/v1/ipos/:code', async (req, res) => {
    try {
      const result = await publicApiService.getIpoByCode(req.params.code);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/v1/ipos/sync', async (req, res) => {
    try {
      const result = await publicApiService.triggerIpoSync();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/v1/ipos/tavan/refresh', async (req, res) => {
    try {
      const result = await publicApiService.triggerTavanRefresh();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // AMERİKAN BORSALARI (US STOCKS & ETFS & 5Y HISTORICAL DATA) ENDPOINTLERİ
  // =========================================================================
  
  // 1. US Top 1.000 Şirket Listesi & Filtreleme
  app.get('/api/v1/us-stocks', async (req, res) => {
    try {
      const { usUniverseService } = await import('./src/services/UsUniverseService.ts');
      const search = req.query.search as string | undefined;
      const sector = req.query.sector as string | undefined;
      const sort = req.query.sort as string | undefined;
      const order = req.query.order as 'asc' | 'desc' | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await usUniverseService.getStocks({ search, sector, sort, order, page, limit });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. US Şirket Detayı (Ticker bazlı)
  app.get('/api/v1/us-stocks/:ticker', async (req, res) => {
    try {
      const { usUniverseService } = await import('./src/services/UsUniverseService.ts');
      const stock = await usUniverseService.getStockByTicker(req.params.ticker);
      if (!stock) {
        return res.status(404).json({ success: false, error: 'Hisse senedi bulunamadı' });
      }
      res.json({ success: true, stock });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. US Hisseleri Senkronizasyonu Tetikle
  app.post('/api/v1/us-stocks/sync', async (req, res) => {
    try {
      const { usUniverseService } = await import('./src/services/UsUniverseService.ts');
      const result = await usUniverseService.syncUsQuotes();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. US Büyük ETF'ler Listesi & Filtreleme
  app.get('/api/v1/us-etfs', async (req, res) => {
    try {
      const { usEtfService } = await import('./src/services/UsEtfService.ts');
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const sort = req.query.sort as string | undefined;
      const order = req.query.order as 'asc' | 'desc' | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await usEtfService.getEtfs({ search, category, sort, order, page, limit });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. US ETF Detayı (Ticker bazlı)
  app.get('/api/v1/us-etfs/:ticker', async (req, res) => {
    try {
      const { usEtfService } = await import('./src/services/UsEtfService.ts');
      const etf = await usEtfService.getEtfByTicker(req.params.ticker);
      if (!etf) {
        return res.status(404).json({ success: false, error: 'ETF bulunamadı' });
      }
      res.json({ success: true, etf });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. US ETF Fiyat & AUM Senkronizasyonu Tetikle
  app.post('/api/v1/us-etfs/sync', async (req, res) => {
    try {
      const { usEtfService } = await import('./src/services/UsEtfService.ts');
      const result = await usEtfService.syncEtfQuotes();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. 5 Yıllık Derin OHLCV Mum ve Performans Verisi (Hisse veya ETF)
  app.get('/api/v1/us-history/:type/:ticker', async (req, res) => {
    try {
      const { usHistoricalService } = await import('./src/services/UsHistoricalService.ts');
      const assetType = req.params.type?.toUpperCase() === 'ETF' ? 'ETF' : 'STOCK';
      const history = await usHistoricalService.get5YearPerformance(req.params.ticker, assetType);
      res.json({ success: true, history });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Tüm US Varlıkları İçin 5 Yıllık Veri Arşivleme (Gece Botu Simülasyonu)
  app.post('/api/v1/us-history/sync-all', async (req, res) => {
    try {
      const { usHistoricalService } = await import('./src/services/UsHistoricalService.ts');
      const result = await usHistoricalService.syncAll5YearHistory();
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- ANALİST YORUMLARI & ARAŞTIRMA RAPORLARI (BIST, ABD, TEFAS, KRİPTO + YZ SENTEZ KATMANI) ---
  // 1. Analist Raporları Listesi & Filtreleme (ToS/Telif korumalı YZ sentezi)
  app.get('/api/v1/analyst-reports', async (req, res) => {
    try {
      const { analystCommentaryService } = await import('./src/services/AnalystCommentaryService.ts');
      const market = req.query.market as any;
      const ticker = req.query.ticker as string | undefined;
      const source = req.query.source as string | undefined;
      const sentiment = req.query.sentiment as string | undefined;
      const recommendation = req.query.recommendation as string | undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await analystCommentaryService.getReports({
        market,
        ticker,
        source,
        sentiment,
        recommendation,
        search,
        page,
        limit,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Piyasa Konsensüsü & Genel İstatistikler
  app.get('/api/v1/analyst-reports/consensus', async (req, res) => {
    try {
      const { analystCommentaryService } = await import('./src/services/AnalystCommentaryService.ts');
      const market = (req.query.market as any) || 'ALL';
      const consensus = await analystCommentaryService.getMarketConsensus(market);
      res.json({ success: true, consensus });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Tekil Hisse/Varlık Analist Konsensüsü ve Raporları (Örn: /api/v1/analyst-reports/ticker/THYAO)
  app.get('/api/v1/analyst-reports/ticker/:ticker', async (req, res) => {
    try {
      const { analystCommentaryService } = await import('./src/services/AnalystCommentaryService.ts');
      const consensus = await analystCommentaryService.getConsensusByTicker(req.params.ticker);
      if (!consensus) {
        return res.status(404).json({ success: false, error: 'Bu varlık için analist raporu bulunamadı.' });
      }
      res.json({ success: true, ...consensus });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Analist Raporları Senkronizasyonu & YZ Sentezini Tetikle
  app.post('/api/v1/analyst-reports/sync', async (req, res) => {
    try {
      const { analystCommentaryService } = await import('./src/services/AnalystCommentaryService.ts');
      const result = await analystCommentaryService.syncFromSources();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Ham Metin Üzerinden Anlık YZ Sentezi Oluştur
  app.post('/api/v1/analyst-reports/synthesize', async (req, res) => {
    try {
      const { analystCommentaryService } = await import('./src/services/AnalystCommentaryService.ts');
      const { ticker, assetName, market, sourceName, title, rawText } = req.body;
      if (!ticker || !rawText) {
        return res.status(400).json({ success: false, error: 'ticker ve rawText alanları zorunludur.' });
      }
      const synthesis = await analystCommentaryService.synthesizeCommentary({
        ticker,
        assetName: assetName || ticker,
        market: market || 'BIST',
        sourceName: sourceName || 'Özel Analiz',
        title: title || `${ticker} Analist Notu`,
        rawText,
      });
      res.json({ success: true, synthesis });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------------------------------------
  // 360° ÇAPRAZ VARLIK EŞLEŞTİRME & BİRLEŞİK VARLIK MOTORU (UNIFIED ASSET HUB)
  // ----------------------------------------------------------------------------------
  // 1. Tüm Varlıkların Çok Katmanlı Eşleşme Listesi
  app.get('/api/v1/assets/list', async (req, res) => {
    try {
      const { assetHubService } = await import('./src/services/AssetHubService.ts');
      const result = await assetHubService.getLinkedAssets({
        market: req.query.market as string,
        search: req.query.search as string,
        hasAnalyst: req.query.hasAnalyst === 'true',
        hasHoldings: req.query.hasHoldings === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Belirli Bir Varlık İçin 360° Eksiksiz Çapraz Eşleşme Profili
  app.get('/api/v1/assets/profile/:code', async (req, res) => {
    try {
      const { assetHubService } = await import('./src/services/AssetHubService.ts');
      const profile = await assetHubService.getUnifiedAssetProfile(req.params.code);
      res.json({ success: true, ...profile });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Tüm Veritabanı Tablolarını Ana Varlık Rehberi ile Çapraz Eşleştir / Sync
  app.post('/api/v1/assets/sync-registry', async (req, res) => {
    try {
      const { assetHubService } = await import('./src/services/AssetHubService.ts');
      const result = await assetHubService.syncMasterAssetRegistry();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ----------------------------------------------------------------------------------
  // SEKTÖREL İSTİHBARAT, ROTASYON RADARI & GÖRECE DEĞERLEME (SECTOR ANALYTICS HUB)
  // ----------------------------------------------------------------------------------
  // 1. Sektörel Genel Bakış, Isı Haritası ve Rotasyon Göstergeleri
  app.get('/api/v1/sectors/overview', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const market = (req.query.market as 'BIST' | 'US' | 'ALL') || 'ALL';
      const result = await sectorAnalyticsService.getSectorsOverview(market);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 1b. Hisse Düzeyi Canlı Isı Haritası (Finviz / BIST Treemap)
  app.get('/api/v1/sectors/stocks-heatmap', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const market = (req.query.market as 'BIST' | 'US' | 'ALL') || 'BIST';
      const sectors = await sectorAnalyticsService.getStocksHeatmap(market);
      res.json({ success: true, sectors });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Sektör Detayı: Benchmarking Matrisi, TEFAS Fon Payları, Analist Raporları ve KAP/Haberler
  app.get('/api/v1/sectors/detail/:sectorName', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const market = req.query.market as 'BIST' | 'US' | undefined;
      const result = await sectorAnalyticsService.getSectorDetail(req.params.sectorName, market);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Göreceli Değerleme Taraması: Sektörüne Göre En İskontolu ve En Primli Hisseler
  app.get('/api/v1/sectors/valuation-screener', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const market = (req.query.market as 'BIST' | 'US') || 'BIST';
      const minDiscount = req.query.minDiscount ? parseInt(req.query.minDiscount as string, 10) : 10;
      const result = await sectorAnalyticsService.getRelativeValuationScreener(market, minDiscount);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Sektöre En Çok Yatırım Yapan TEFAS Fonları
  app.get('/api/v1/sectors/top-funds/:sectorName', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const market = (req.query.market as 'BIST' | 'US') || 'BIST';
      const result = await sectorAnalyticsService.getSectorTopFunds(req.params.sectorName, market);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Sektörler Arası Karşılaştırma Matrisi (Benchmarking Comparator)
  app.post('/api/v1/sectors/compare', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const { sectorNames, market } = req.body;
      const result = await sectorAnalyticsService.compareSectors(sectorNames || [], market || 'BIST');
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. AI Destekli Makro ve Sektörel Rotasyon Sentezi (Gemini 2.5)
  app.get('/api/v1/sectors/ai-insight/:sectorName', async (req, res) => {
    try {
      const { sectorAnalyticsService } = await import('./src/services/SectorAnalyticsService.ts');
      const market = (req.query.market as 'BIST' | 'US') || 'BIST';
      const result = await sectorAnalyticsService.getSectorAiSynthesis(req.params.sectorName, market);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 10. Otomatik Zamanlayıcı / Scheduler Durumu
  app.get('/api/v1/scheduler/status', (req, res) => {
    res.json(automatedSchedulerService.getStatus());
  });

  // 11. Zamanlanmış Görevi Manuel Tetikle
  app.post('/api/v1/scheduler/trigger/:taskId', async (req, res) => {
    try {
      const result = await automatedSchedulerService.runTask(req.params.taskId, true);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 12. Zamanlanmış Görevi Aktif/Pasif Yap
  app.post('/api/v1/scheduler/toggle/:taskId', async (req, res) => {
    try {
      const enabled = req.body.enabled !== false;
      const success = await automatedSchedulerService.toggleTask(req.params.taskId, enabled);
      res.json({ success, taskId: req.params.taskId, enabled });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // ZERO-DOWNTIME RESILIENCE & MULTI-TIER RECOVERY API ENDPOINTS
  // =========================================================================
  
  // 1. Get complete status of all 6 resilience pillars
  app.get('/api/v1/resilience/status', async (req, res) => {
    try {
      const circuitMetrics = circuitBreakerRegistry.getAllMetrics();
      const proxyTiers = proxyChainService.getTiers();
      const ringBufferStats = offlineRingBuffer.getBufferStats();
      const healingRules = selfHealingSchemaParser.getActiveHealingRules();
      const deduplicationStats = zeroDowntimeEngine.getDeduplicationStats();
      const isAutoFailover = await dataSourceHealthService.isAutoFailoverEnabled();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        pillars: {
          activeActiveStreamRace: {
            enabled: zeroDowntimeEngine.isActiveActiveEnabled(),
            deduplication: deduplicationStats,
            status: 'OPERATIONAL',
          },
          circuitBreakers: {
            totalTracked: circuitMetrics.length,
            openCount: circuitMetrics.filter(c => c.state === 'OPEN').length,
            halfOpenCount: circuitMetrics.filter(c => c.state === 'HALF_OPEN').length,
            closedCount: circuitMetrics.filter(c => c.state === 'CLOSED').length,
            metrics: circuitMetrics,
          },
          proxyFallbackChain: {
            activeTiers: proxyTiers.filter(t => t.active).length,
            totalTiers: proxyTiers.length,
            tiers: proxyTiers,
          },
          offlineRingBuffer: {
            categoriesCount: ringBufferStats.length,
            stats: ringBufferStats,
            storageType: 'Dual Memory + IndexedDB Persistent',
          },
          aiSelfHealingParser: {
            enabled: true,
            model: 'gemini-3.8-flash',
            activeRulesCount: healingRules.length,
            rules: healingRules,
          },
          p2pMeshRelay: {
            protocol: 'WebRTC / BroadcastChannel Mesh',
            active: true,
          }
        },
        autoFailoverEnabled: isAutoFailover,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Trigger Active-Active Stream Race Test
  app.post('/api/v1/resilience/test-race', async (req, res) => {
    try {
      const { category = 'TCMB' } = req.body;
      
      const candidates: Array<{
        id: string;
        name: string;
        url: string;
        fetcher: () => Promise<any>;
      }> = [
        {
          id: 'tcmb_primary',
          name: 'TCMB Resmi XML (Primary)',
          url: 'https://www.tcmb.gov.tr/kurlar/today.xml',
          fetcher: async () => {
            const resp = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
              headers: { 'User-Agent': 'FinanceBot/1.0' }
            });
            const txt = await resp.text();
            return { source: 'TCMB Primary', length: txt.length, date: new Date().toISOString() };
          }
        },
        {
          id: 'binance_mirror',
          name: 'Binance USDT/TRY (Backup Forex)',
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY',
          fetcher: async () => {
            const resp = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY');
            const data = await resp.json();
            return { source: 'Binance Mirror', price: data.price, date: new Date().toISOString() };
          }
        }
      ];

      const result = await zeroDowntimeEngine.raceStreams<any>(category, candidates, 5000);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Test AI Self-Healing Schema Parser on damaged payload
  app.post('/api/v1/resilience/test-heal', async (req, res) => {
    try {
      const sampleBrokenPayload = req.body.payload || `
        <html><body>
          <div class="legacy-data-box">
            <span>Dolar Alis: <b>38.45</b></span>
            <span>Euro Alis: <b>42.10</b></span>
            <span class="warning">API Deprecated - switch to v3</span>
          </div>
        </body></html>
      `;

      const targetSchema = `
        {
          "USD": { "buy": number, "code": "USD/TRY" },
          "EUR": { "buy": number, "code": "EUR/TRY" }
        }
      `;

      const healed = await selfHealingSchemaParser.healAndExtract(
        'test_fx_source',
        sampleBrokenPayload,
        targetSchema,
        '{"USD": {"buy": 38.45, "code": "USD/TRY"}, "EUR": {"buy": 42.10, "code": "EUR/TRY"}}'
      );

      res.json({ success: true, healed });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Trip or Reset a Circuit Breaker manually
  app.post('/api/v1/resilience/circuit-action', (req, res) => {
    try {
      const { endpoint, action } = req.body;
      const breaker = circuitBreakerRegistry.getBreaker(endpoint || 'https://www.tcmb.gov.tr/kurlar/today.xml');
      
      if (action === 'trip') {
        breaker.trip();
      } else if (action === 'reset') {
        breaker.reset();
      } else if (action === 'reset_all') {
        circuitBreakerRegistry.resetAll();
      }

      res.json({ success: true, metric: breaker.getMetrics() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Update Resilience Settings (Toggle Active-Active, Proxy Tiers)
  app.post('/api/v1/resilience/settings', async (req, res) => {
    try {
      const { activeActiveEnabled, tierId, tierActive } = req.body;
      if (activeActiveEnabled !== undefined) {
        zeroDowntimeEngine.setActiveActiveEnabled(Boolean(activeActiveEnabled));
      }
      if (tierId && tierActive !== undefined) {
        proxyChainService.setTierActive(tierId, Boolean(tierActive));
      }
      res.json({ success: true, message: 'Dayanıklılık ayarları güncellendi.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // TELEGRAM ALARM & SİSTEM SAĞLIK RAPORLAYICI ENDPOINTLERİ
  // =========================================================================
  
  // 1. Telegram Ayarlarını Getir
  app.get('/api/v1/telegram/config', async (req, res) => {
    try {
      const config = await telegramService.getConfig();
      const nextScheduledReportAt = telegramService.getNextScheduledReportInfo();
      const istanbul = telegramService.getIstanbulTime();
      res.json({ 
        success: true, 
        config: { 
          ...config, 
          nextScheduledReportAt,
          currentIstanbulTime: istanbul.timeString 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Telegram Ayarlarını Kaydet / Güncelle
  app.post('/api/v1/telegram/config', async (req, res) => {
    try {
      const updatedConfig = await telegramService.saveConfig(req.body);
      const nextScheduledReportAt = telegramService.getNextScheduledReportInfo();
      const istanbul = telegramService.getIstanbulTime();
      res.json({ 
        success: true, 
        config: { 
          ...updatedConfig, 
          nextScheduledReportAt,
          currentIstanbulTime: istanbul.timeString 
        }, 
        message: 'Telegram ayarları ve rapor başlangıç saati başarıyla güncellendi.' 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Telegram Test Mesajı Gönder
  app.post('/api/v1/telegram/test', async (req, res) => {
    try {
      const { token, chatId } = req.body;
      const result = await telegramService.sendTestMessage(token, chatId);
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. Manuel Sistem Sağlık Raporu Tetikle
  app.post('/api/v1/telegram/health-report', async (req, res) => {
    try {
      const result = await telegramService.sendHealthReport(true);
      if (result.success) {
        res.json({ success: true, message: 'Sistem sağlık raporu Telegram kanalına başarıyla iletildi.', report: result.reportText });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Telegram Gönderim Logları
  app.get('/api/v1/telegram/logs', (req, res) => {
    try {
      const logs = telegramService.getRecentLogs();
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // API YÖNETİM & DİAGNOSTİK MERKEZİ (API HUB & TELEMETRY ADMIN)
  // =========================================================================

  // 1. Canlı Telemetri, Trafik Metrikleri & İstek Logları
  app.get('/api/v1/admin/telemetry', (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const data = apiTelemetryService.getTelemetry(limit);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Telemetri Loglarını Temizle
  app.post('/api/v1/admin/telemetry/clear', (req, res) => {
    try {
      const result = apiTelemetryService.clearLogs();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Kapsamlı Sistem & Sağlayıcı Diagnostiği (Tüm Servisleri Canlı Test Et)
  app.get('/api/v1/admin/diagnostics', async (req, res) => {
    try {
      const diagnostics = await apiTelemetryService.runDiagnostics();
      res.json(diagnostics);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. API Anahtarlarını Listele
  app.get('/api/v1/admin/api-keys', (req, res) => {
    try {
      const keys = apiTelemetryService.getApiKeys();
      res.json(keys);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Yeni API Anahtarı Oluştur
  app.post('/api/v1/admin/api-keys', (req, res) => {
    try {
      const { name, tier, rateLimit } = req.body;
      const result = apiTelemetryService.createApiKey({ name, tier, rateLimit });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. API Anahtarı Durumunu Değiştir (Aktif / Askıda / İptal)
  app.patch('/api/v1/admin/api-keys/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      const result = apiTelemetryService.updateApiKeyStatus(req.params.id, status);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. API Anahtarını Sil
  app.delete('/api/v1/admin/api-keys/:id', (req, res) => {
    try {
      const result = apiTelemetryService.deleteApiKey(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Ana API Aktivasyon & Bakım Modu Değiştirici (Master Switch)
  app.post('/api/v1/admin/system/master-status', (req, res) => {
    try {
      const { status } = req.body;
      if (!['LIVE', 'MAINTENANCE', 'READ_ONLY'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Geçersiz statü. (LIVE | MAINTENANCE | READ_ONLY olmalı)' });
      }
      const result = apiTelemetryService.setMasterStatus(status);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // MARKETPULSE AI - KAPSAMLI VERİ ENTEGRASYONU VE DIŞA/İÇE AKTARIM (EXPORT/IMPORT/SCREENER)
  // =========================================================================

  // 1. BIST Piyasa & Screener Hisseleri
  app.get(['/api/export/companies', '/api/screener/stocks'], async (req, res) => {
    try {
      const companies = await comprehensiveDataService.getCompaniesExport();
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. KAP Bilanço, Gelir Tablosu & Finansal Kalemler (36 Sütun)
  app.get('/api/export/financials/:ticker', async (req, res) => {
    try {
      const financials = await comprehensiveDataService.getFinancialsExport(req.params.ticker);
      if (financials.length === 1) {
        res.json(financials[0]);
      } else {
        res.json(financials);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/export/financials', async (req, res) => {
    try {
      const financials = await comprehensiveDataService.getFinancialsExport();
      res.json(financials);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. TEFAS & Takasbank Yatırım Fonları
  app.get('/api/export/funds', async (req, res) => {
    try {
      const funds = await comprehensiveDataService.getFundsExport();
      res.json(funds);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/export/fund/:code', async (req, res) => {
    try {
      const fund = await comprehensiveDataService.getFundsExport(req.params.code);
      if (fund.length > 0) {
        res.json(fund[0]);
      } else {
        res.status(404).json({ success: false, error: `Fon bulunamadı: ${req.params.code}` });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. SPK Halka Arz (IPO) Listesi & Dağıtım Bilgileri
  app.get(['/api/export/ipo', '/api/export/ipos', '/api/admin/ipo', '/api/ipos/structured'], async (req, res) => {
    try {
      const ipos = await comprehensiveDataService.getIposExport();
      res.json(ipos);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Şirket Geri Alımları (Share Buybacks)
  app.get(['/api/export/buybacks', '/api/buybacks'], async (req, res) => {
    try {
      const buybacks = await comprehensiveDataService.getBuybacksExport();
      res.json(buybacks);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. KAP Özel Durum Açıklamaları & Bildirimler
  app.get(['/api/export/disclosures', '/api/disclosures/export'], async (req, res) => {
    try {
      const disclosures = await comprehensiveDataService.getDisclosuresExport();
      res.json(disclosures);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Toplu Dışa Aktarma (Bulk Export by Table Parameters)
  app.get('/api/export/bulk', async (req, res) => {
    try {
      const tableQuery = req.query.tables ? String(req.query.tables).split(',').map(t => t.trim()) : undefined;
      const bulkData = await comprehensiveDataService.getBulkExport(tableQuery);
      res.json(bulkData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. Toplu İçe Aktarma (Bulk JSON Ingestion API)
  app.post(['/api/import/bulk', '/api/import/json'], async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Geçersiz JSON yükü.' });
      }
      const result = await comprehensiveDataService.importBulkData(payload);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. Uzak Veri Sunucusundan Otomatik Senkronizasyon (Cloudflare Tunnel / Local Finance API)
  app.post('/api/sync/remote-finance-api', async (req, res) => {
    try {
      const { baseUrl } = req.body;
      if (!baseUrl) {
        return res.status(400).json({ success: false, error: 'baseUrl parametresi zorunludur.' });
      }
      const result = await comprehensiveDataService.syncFromRemoteFinanceApi(baseUrl);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // CANLI OFİS REALTIME SERVER-SENT EVENTS (SSE) ENDPOINT
  // =========================================================================
  app.get('/api/v1/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering for instant delivery
    res.flushHeaders();

    // 1. Send recent events immediately upon connection so the office isn't blank
    const recent = appEventBus.getRecentEvents();
    res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', events: recent })}\n\n`);

    // 2. Stream new live events as they happen
    const onOfficeEvent = (event: any) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error('[SSE Stream Write Error]:', err);
      }
    };

    appEventBus.on('office_event', onOfficeEvent);

    // 3. Keep-alive heartbeat ping every 20 seconds
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        // Ignored
      }
    }, 20000);

    // 4. Cleanup listener and interval on client disconnect
    req.on('close', () => {
      clearInterval(heartbeatTimer);
      appEventBus.removeListener('office_event', onOfficeEvent);
      res.end();
    });
  });

  // --- Vite Middleware (Development & Production SPA) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);

    // Graceful asynchronous bootstrap after server is listening
    setTimeout(async () => {
      try {
        const isDbReady = await ensureDatabaseConnected(5, 2000);
        if (!isDbReady) {
          console.warn('[Startup] Veritabanı bağlantısı henüz hazır değil, arka plan görevleri ertelendi.');
          return;
        }
      } catch (e: any) {
        console.warn('[Startup] Veritabanı hazırlık uyarısı:', e.message);
      }

      try {
        await comprehensiveDataService.initializeSeedData();
      } catch (e: any) {
        console.warn('[Startup] Seed data notice:', e.message);
      }

      try {
        await scheduleSyncJobs();
      } catch (e: any) {
        console.warn('[Startup] Multi-sync schedule notice:', e.message);
      }

      try {
        await automatedSchedulerService.init();
      } catch (e: any) {
        console.warn('[Startup] Automated scheduler notice:', e.message);
      }

      try {
        await telegramService.initScheduler();
      } catch (e: any) {
        console.warn('[Startup] Telegram service notice:', e.message);
      }

      try {
        const { assetHubService } = await import('./src/services/AssetHubService.ts');
        await assetHubService.syncMasterAssetRegistry();
      } catch (e: any) {
        console.warn('[Startup] AssetHub registry notice:', e.message);
      }
    }, 1000);
  });
}

startServer().catch(console.error);
