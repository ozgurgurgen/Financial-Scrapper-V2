import axios from 'axios';
import { db } from '../db/index.ts';
import { settings } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { multiLLMService } from './MultiLLMService.ts';

export interface DataSourceDefinition {
  id: string;
  name: string;
  category: 'BIST' | 'KRIPTO' | 'TCMB' | 'KAP' | 'HABER' | 'TEFAS' | 'GLOBAL';
  primaryUrl: string;
  checkMethod: 'GET' | 'POST';
  payload?: any;
  expectedType: 'json' | 'html' | 'xml';
  description: string;
}

export interface FailoverLog {
  id: string;
  sourceId: string;
  sourceName: string;
  previousUrl: string;
  newUrl: string;
  candidateName: string;
  triggeredAt: string;
  status: 'SUCCESS' | 'FAILED';
  details: string;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  category: string;
  url: string;
  isOverridden: boolean;
  activeUrl: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  httpStatus?: number;
  responseTimeMs?: number;
  lastChecked: string;
  errorMessage?: string;
  description: string;
  failoverInfo?: {
    switched: boolean;
    switchedToName?: string;
    switchedToUrl?: string;
    switchedAt?: string;
  };
}

export interface AlternativeCandidate {
  name: string;
  url: string;
  type: 'REST API' | 'RSS' | 'JSON' | 'HTML Scrape';
  reliabilityScore: number; // 0 - 100
  notes: string;
  sampleFormat?: string;
}

export const KNOWN_DATA_SOURCES: DataSourceDefinition[] = [
  {
    id: 'bist_quotes',
    name: 'BIST 100 & Hisse Fiyatları',
    category: 'BIST',
    primaryUrl: 'https://bigpara.hurriyet.com.tr/borsa/canli-borsa/',
    checkMethod: 'GET',
    expectedType: 'html',
    description: 'Borsa İstanbul anlık canlı hisse fiyatları ve hacim verileri.',
  },
  {
    id: 'tcmb_fx',
    name: 'TCMB Döviz & Gösterge Kurları',
    category: 'TCMB',
    primaryUrl: 'https://www.tcmb.gov.tr/kurlar/today.xml',
    checkMethod: 'GET',
    expectedType: 'xml',
    description: 'Türkiye Cumhuriyet Merkez Bankası günlük resmi kur bülteni.',
  },
  {
    id: 'crypto_prices',
    name: 'Kripto Para Fiyatları & 24s Veriler',
    category: 'KRIPTO',
    primaryUrl: 'https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]',
    checkMethod: 'GET',
    expectedType: 'json',
    description: 'Binance & CoinGecko kripto fiyat ve 24 saatlik değişim verileri.',
  },
  {
    id: 'kap_disclosures',
    name: 'KAP Şirket Bildirimleri',
    category: 'KAP',
    primaryUrl: 'https://www.kap.org.tr/tr/api/disclosure/list/light',
    checkMethod: 'GET',
    expectedType: 'json',
    description: 'Kamuyu Aydınlatma Platformu anlık şirket özel durum açıklamaları.',
  },
  {
    id: 'tefas_funds',
    name: 'TEFAS Yatırım Fonları',
    category: 'TEFAS',
    primaryUrl: 'https://www.tefas.gov.tr/api/funds/fonGetiriBazliBilgiGetir',
    checkMethod: 'POST',
    payload: {
      dil: 'TR',
      fonTipi: 'YAT',
      islem: 1,
      calismaTipi: 2,
      getiriOrani: '1',
    },
    expectedType: 'json',
    description: 'Takasbank TEFAS resmi fon getirileri ve portföy API servisi.',
  },
  {
    id: 'market_news',
    name: 'Piyasa & Finansal Haber Beslemeleri',
    category: 'HABER',
    primaryUrl: 'https://www.bloomberght.com/rss',
    checkMethod: 'GET',
    expectedType: 'xml',
    description: 'Bloomberg HT, Foreks ve finans haber RSS servisleri.',
  },
  {
    id: 'ipo_listings',
    name: 'SPK Halka Arz & Taslak İzahnameler',
    category: 'BIST',
    primaryUrl: 'https://halkaarz.com/',
    checkMethod: 'GET',
    expectedType: 'html',
    description: 'Halka arz takvimi, onaylanan şirketler ve oransal/eşit dağıtım verileri.',
  },
  {
    id: 'us_equities',
    name: 'ABD Hisse Senetleri (NYSE/NASDAQ)',
    category: 'GLOBAL',
    primaryUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
    checkMethod: 'GET',
    expectedType: 'json',
    description: 'ABD borsalarındaki en büyük şirketlerin fiyat, bilanço ve değerleme oranları.',
  },
  {
    id: 'us_etfs',
    name: 'ABD ETF Fonları (Borsada İşlem Gören Fonlar)',
    category: 'GLOBAL',
    primaryUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=1d',
    checkMethod: 'GET',
    expectedType: 'json',
    description: 'S&P 500 (SPY), Nasdaq (QQQ), Dow Jones ETF fonları ve yönetim büyüklükleri.',
  },
  {
    id: 'analyst_commentary',
    name: 'Kurumsal Analist Raporları',
    category: 'HABER',
    primaryUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d',
    checkMethod: 'GET',
    expectedType: 'json',
    description: 'Global piyasa endeksleri ve kurumsal analist araştırma verileri.',
  },
  {
    id: 'kap_fund_portfolios',
    name: 'KAP Fon Portföy Dağılım Raporları',
    category: 'KAP',
    primaryUrl: 'https://www.kap.org.tr/tr/api/disclosure/list/light',
    checkMethod: 'GET',
    expectedType: 'json',
    description: 'Yatırım fonlarının (TEFAS) portföy dağılımı ve KAP resmi bültenleri.',
  },
];

export class DataSourceHealthService {
  /**
   * Reads URL overrides configured by user or auto-failover
   */
  async getOverrides(): Promise<Record<string, string>> {
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'data_source_overrides')).limit(1);
      if (rows.length > 0 && rows[0].value) {
        return rows[0].value as Record<string, string>;
      }
    } catch (e) {
      console.warn('[DataSourceHealthService] Failed to read overrides:', e);
    }
    return {};
  }

  /**
   * Reads auto-failover configuration
   */
  async isAutoFailoverEnabled(): Promise<boolean> {
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'auto_failover_enabled')).limit(1);
      if (rows.length > 0 && rows[0].value !== undefined) {
        return Boolean(rows[0].value);
      }
    } catch (e) {
      console.warn('[DataSourceHealthService] Failed to read auto_failover_enabled setting:', e);
    }
    return true; // Enabled by default
  }

  async setAutoFailoverEnabled(enabled: boolean): Promise<boolean> {
    await db
      .insert(settings)
      .values({
        key: 'auto_failover_enabled',
        value: enabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: enabled,
          updatedAt: new Date(),
        },
      });
    return enabled;
  }

  /**
   * Retrieves failover history logs
   */
  async getFailoverLogs(): Promise<FailoverLog[]> {
    try {
      const rows = await db.select().from(settings).where(eq(settings.key, 'failover_history_logs')).limit(1);
      if (rows.length > 0 && Array.isArray(rows[0].value)) {
        return rows[0].value as FailoverLog[];
      }
    } catch (e) {
      console.warn('[DataSourceHealthService] Failed to read failover logs:', e);
    }
    return [];
  }

  /**
   * Appends an entry to the failover audit log
   */
  async recordFailoverLog(log: Omit<FailoverLog, 'id' | 'triggeredAt'>): Promise<void> {
    try {
      const currentLogs = await this.getFailoverLogs();
      const newEntry: FailoverLog = {
        id: 'fo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ...log,
        triggeredAt: new Date().toISOString(),
      };
      // Keep last 50 logs
      const updated = [newEntry, ...currentLogs].slice(0, 50);

      await db
        .insert(settings)
        .values({
          key: 'failover_history_logs',
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

      // Notify Telegram asynchronously
      try {
        import('./TelegramService.ts').then(({ telegramService }) => {
          telegramService.sendAlert({
            title: `Otomatik Failover Gerçekleşti: ${log.sourceName}`,
            type: 'FAILOVER',
            details: `Kaynak erişilemez duruma düştü ve sistem otomatik olarak yedek adrese geçiş yaptı.\n\nEski Uç Nokta: ${log.previousUrl}\nYeni Aktif Kaynak: ${log.candidateName} (${log.newUrl})\nDurum: ${log.status}\nAçıklama: ${log.details}`,
            source: log.sourceName,
            url: log.newUrl,
            payload: {
              sourceId: log.sourceId,
              candidate: log.candidateName,
            },
          }).catch(() => {});
        }).catch(() => {});
      } catch (e) {}
    } catch (e) {
      console.error('[DataSourceHealthService] Failed to record failover log:', e);
    }
  }

  /**
   * Checks health status of all registered data sources.
   * If autoFailover is true (or enabled in settings), any DOWN source automatically triggers
   * candidate testing and auto-switches to the next best working candidate.
   */
  async checkAllSourcesHealth(forceAutoFailover?: boolean): Promise<{
    statuses: DataSourceStatus[];
    failoverActions: Array<{ sourceId: string; from: string; to: string; candidateName: string }>;
    autoFailoverEnabled: boolean;
  }> {
    const overrides = await this.getOverrides();
    const isAutoEnabled = forceAutoFailover !== undefined ? forceAutoFailover : await this.isAutoFailoverEnabled();
    const results: DataSourceStatus[] = [];
    const failoverActions: Array<{ sourceId: string; from: string; to: string; candidateName: string }> = [];

    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, text/html, application/xml, */*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    for (const src of KNOWN_DATA_SOURCES) {
      let activeUrl = overrides[src.id] || src.primaryUrl;
      const startTime = Date.now();
      let status: 'HEALTHY' | 'DEGRADED' | 'DOWN' = 'DOWN';
      let httpStatus: number | undefined;
      let responseTimeMs: number | undefined;
      let errorMessage: string | undefined;

      try {
        let resp;
        if (src.checkMethod === 'POST' && src.payload && activeUrl === src.primaryUrl) {
          resp = await axios.post(activeUrl, src.payload, {
            headers: {
              ...defaultHeaders,
              'Content-Type': 'application/json',
              'Origin': 'https://www.tefas.gov.tr',
              'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
            },
            timeout: 12000,
            maxRedirects: 5,
            validateStatus: () => true,
          });
        } else {
          resp = await axios.get(activeUrl, {
            headers: {
              ...defaultHeaders,
              'Referer': 'https://www.kap.org.tr/',
            },
            timeout: 12000,
            maxRedirects: 5,
            validateStatus: () => true,
          });
        }

        const elapsed = Date.now() - startTime;
        responseTimeMs = elapsed;
        httpStatus = resp.status;
        const isSuccess = resp.status >= 200 && resp.status < 400;

        if (isSuccess) {
          status = elapsed > 4000 ? 'DEGRADED' : 'HEALTHY';
        } else {
          status = 'DOWN';
          errorMessage = `HTTP Hata Kodu: ${resp.status} - ${resp.statusText || 'Hata'}`;
        }
      } catch (err: any) {
        responseTimeMs = Date.now() - startTime;
        status = 'DOWN';
        errorMessage = err.message || 'Bağlantı zaman aşımına uğradı veya erişilemedi.';
      }

      // ─── AUTOMATED FAILOVER TRIGGER ─────────────────────────────────────────
      let failoverInfo: DataSourceStatus['failoverInfo'] = undefined;

      if (status === 'DOWN' && isAutoEnabled) {
        console.warn(`[AutoFailover] Source ${src.id} (${src.name}) is DOWN! Searching and testing next best candidate...`);
        try {
          const failoverResult = await this.executeFailoverForSource(src, activeUrl);
          if (failoverResult.success && failoverResult.candidate) {
            status = 'HEALTHY';
            activeUrl = failoverResult.candidate.url;
            overrides[src.id] = activeUrl;
            responseTimeMs = failoverResult.responseTimeMs;
            errorMessage = undefined;
            failoverInfo = {
              switched: true,
              switchedToName: failoverResult.candidate.name,
              switchedToUrl: failoverResult.candidate.url,
              switchedAt: new Date().toISOString(),
            };
            failoverActions.push({
              sourceId: src.id,
              from: failoverResult.previousUrl,
              to: failoverResult.candidate.url,
              candidateName: failoverResult.candidate.name,
            });
          }
        } catch (foError: any) {
          console.error(`[AutoFailover] Failover attempt for ${src.id} failed:`, foError);
        }
      }

      results.push({
        id: src.id,
        name: src.name,
        category: src.category,
        url: src.primaryUrl,
        isOverridden: !!overrides[src.id],
        activeUrl,
        status,
        httpStatus,
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        description: src.description,
        errorMessage,
        failoverInfo,
      });
    }

    return {
      statuses: results,
      failoverActions,
      autoFailoverEnabled: isAutoEnabled,
    };
  }

  /**
   * Executes failover candidate search, iterative testing, and auto-switching for a down source
   */
  async executeFailoverForSource(src: DataSourceDefinition, failingUrl: string): Promise<{
    success: boolean;
    candidate?: AlternativeCandidate;
    previousUrl: string;
    responseTimeMs?: number;
    error?: string;
  }> {
    // 1. Get candidates sorted by reliability score
    const candidates = await this.discoverAlternativeSources(src.id);
    const sorted = [...candidates].sort((a, b) => b.reliabilityScore - a.reliabilityScore);

    // 2. Iteratively test each candidate from highest score to lowest
    for (const cand of sorted) {
      if (!cand.url || cand.url === failingUrl) continue;

      console.log(`[AutoFailover] Testing candidate "${cand.name}" (${cand.url})...`);
      const test = await this.testEndpoint(cand.url);

      if (test.reachable) {
        console.log(`[AutoFailover] Candidate "${cand.name}" passed health check (${test.responseTimeMs}ms). Switching connection...`);
        // 3. Apply the working candidate as active source override
        await this.applySourceOverride(src.id, cand.url);

        // 4. Record audit log
        await this.recordFailoverLog({
          sourceId: src.id,
          sourceName: src.name,
          previousUrl: failingUrl,
          newUrl: cand.url,
          candidateName: cand.name,
          status: 'SUCCESS',
          details: `Kesinti tespit edildi. Test edilen '${cand.name}' (${cand.type}, %${cand.reliabilityScore} güven skoru) ${test.responseTimeMs}ms içinde başarılı yanıt verdi ve bağlantı otomatik olarak aktarıldı.`,
        });

        return {
          success: true,
          candidate: cand,
          previousUrl: failingUrl,
          responseTimeMs: test.responseTimeMs,
        };
      } else {
        console.warn(`[AutoFailover] Candidate "${cand.name}" failed test: ${test.error || 'Unreachable'}`);
      }
    }

    // All candidates failed
    await this.recordFailoverLog({
      sourceId: src.id,
      sourceName: src.name,
      previousUrl: failingUrl,
      newUrl: failingUrl,
      candidateName: 'Hiçbiri',
      status: 'FAILED',
      details: `Kesinti tespit edildi ancak test edilen ${sorted.length} alternatif adayın hiçbiri geçerli yanıt döndürmedi.`,
    });

    return {
      success: false,
      previousUrl: failingUrl,
      error: 'Tüm alternatif adaylar test edildi ancak çalışan bir kaynak bulunamadı.',
    };
  }

  /**
   * Tests a specific URL connectivity and response
   */
  async testEndpoint(url: string): Promise<{
    reachable: boolean;
    status?: number;
    responseTimeMs: number;
    contentType?: string;
    sampleSnippet?: string;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, text/html, application/xml, */*',
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const responseTimeMs = Date.now() - start;
      const isOk = res.status >= 200 && res.status < 400;
      let sampleSnippet = '';
      if (typeof res.data === 'object') {
        sampleSnippet = JSON.stringify(res.data).slice(0, 300);
      } else if (typeof res.data === 'string') {
        sampleSnippet = res.data.slice(0, 300).replace(/\s+/g, ' ');
      }

      return {
        reachable: isOk,
        status: res.status,
        responseTimeMs,
        contentType: String(res.headers['content-type'] || ''),
        sampleSnippet,
        error: isOk ? undefined : `HTTP ${res.status}: ${res.statusText || 'Error'}`,
      };
    } catch (err: any) {
      return {
        reachable: false,
        responseTimeMs: Date.now() - start,
        error: err.message || 'İstek zaman aşımına uğradı veya erişilemedi.',
      };
    }
  }

  /**
   * Uses the user's active LLM model to discover alternative working data endpoints
   */
  async discoverAlternativeSources(sourceId: string, customPrompt?: string): Promise<AlternativeCandidate[]> {
    const targetSource = KNOWN_DATA_SOURCES.find((s) => s.id === sourceId);
    if (!targetSource) {
      throw new Error(`Bilinmeyen veri kaynağı ID'si: ${sourceId}`);
    }

    const prompt = `
Aşağıdaki finansal veri kaynağında kesinti yaşanıyor veya sayfa yapısı değişti.
Bunun yerine kullanılabilecek EN İYİ, ÜCRETSİZ, AÇIK ve GÜNCEL 3 alternatif veri kaynağı/API/RSS URL'i öner.

Hedef Veri: ${targetSource.name} (${targetSource.category})
Eski URL: ${targetSource.primaryUrl}
Açıklama: ${targetSource.description}
${customPrompt ? `Kullanıcı Özel İsteği: ${customPrompt}` : ''}

Yanıtı SADECE ve KESİNLİKLE aşağıdaki geçerli JSON dizisi formatında döndür (Markdown tırnakları olmadan sadece JSON):
[
  {
    "name": "Kaynak Adı",
    "url": "https://ornek.com/api/...",
    "type": "REST API" | "RSS" | "JSON" | "HTML Scrape",
    "reliabilityScore": 90,
    "notes": "Neden iyi bir alternatif olduğu ve veri içeriği",
    "sampleFormat": "Dönen örnek veri formatı"
  }
]
`;

    try {
      const rawText = await multiLLMService.generateText({
        prompt,
        systemInstruction: 'Sen Türkiye ve Küresel finansal veri API mimarisi konusunda uzman bir sistem mühendisisin. Sadece geçerli JSON çıktısı üret.',
        temperature: 0.2,
      });

      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const candidates: AlternativeCandidate[] = JSON.parse(cleaned);

      if (Array.isArray(candidates) && candidates.length > 0) {
        return candidates;
      }
    } catch (err) {
      console.error('[DataSourceHealthService] AI discovery error:', err);
    }

    // Fallback known reliable alternatives if AI parse fails
    return this.getHardcodedFallbacks(sourceId);
  }

  private getHardcodedFallbacks(sourceId: string): AlternativeCandidate[] {
    switch (sourceId) {
      case 'bist_quotes':
        return [
          {
            name: 'Mynet Finans BIST 100',
            url: 'https://finans.mynet.com/borsa/hisseler/',
            type: 'HTML Scrape',
            reliabilityScore: 88,
            notes: 'Mynet BIST canlı hisse ve endeks tablosu',
          },
          {
            name: 'Investing.com Türkiye Endeksleri',
            url: 'https://tr.investing.com/indices/ise-100',
            type: 'HTML Scrape',
            reliabilityScore: 92,
            notes: 'Küresel ve BIST anlık verileri',
          },
        ];
      case 'crypto_prices':
        return [
          {
            name: 'CoinGecko Simple Price API',
            url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd,try',
            type: 'REST API',
            reliabilityScore: 95,
            notes: 'Ücretsiz ve güvenilir REST API',
          },
          {
            name: 'Binance Ticker Price',
            url: 'https://api.binance.com/api/v3/ticker/price',
            type: 'REST API',
            reliabilityScore: 99,
            notes: 'Yüksek frekanslı resmi Binance REST API',
          },
        ];
      case 'tcmb_fx':
        return [
          {
            name: 'TCMB EVDS API',
            url: 'https://evds2.tcmb.gov.tr/service/evds/',
            type: 'REST API',
            reliabilityScore: 96,
            notes: 'TCMB Resmi Elektronik Veri Dağıtım Sistemi',
          },
        ];
      case 'market_news':
        return [
          {
            name: 'Anadolu Ajansı Finans RSS',
            url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi',
            type: 'RSS',
            reliabilityScore: 94,
            notes: 'Resmi ekonomi ve piyasa haber akışı',
          },
          {
            name: 'Foreks Haber Bülteni',
            url: 'https://www.foreks.com/haberler/',
            type: 'HTML Scrape',
            reliabilityScore: 89,
            notes: 'Anlık BIST ve piyasa bültenleri',
          },
        ];
      case 'kap_disclosures':
        return [
          {
            name: 'KAP Bildirim Servisi (Light)',
            url: 'https://www.kap.org.tr/tr/api/disclosure/list/light',
            type: 'REST API',
            reliabilityScore: 98,
            notes: 'KAP resmi hafif bildirim akışı',
          },
          {
            name: 'Bigpara KAP Bülteni',
            url: 'https://bigpara.hurriyet.com.tr/haberler/kap-haberleri/',
            type: 'HTML Scrape',
            reliabilityScore: 88,
            notes: 'Bigpara entegre KAP bildirimleri',
          }
        ];
      case 'tefas_funds':
        return [
          {
            name: 'TEFAS Fon Getiri Servisi',
            url: 'https://www.tefas.gov.tr/api/funds/fonGetiriBazliBilgiGetir',
            type: 'REST API',
            reliabilityScore: 99,
            notes: 'Takasbank TEFAS resmi getiri endpoint',
          },
          {
            name: 'Fintables Fon Analizi',
            url: 'https://fintables.com/fonlar',
            type: 'HTML Scrape',
            reliabilityScore: 90,
            notes: 'Fintables fon listesi ve detayları',
          }
        ];
      default:
        return [
          {
            name: 'Genel Finans Portalı',
            url: 'https://www.dunya.com/ekonomi',
            type: 'RSS',
            reliabilityScore: 85,
            notes: 'Ekonomi ve piyasa gündemi',
          },
        ];
    }
  }

  /**
   * Applies and saves a user-selected URL override
   */
  async applySourceOverride(sourceId: string, newUrl: string): Promise<Record<string, string>> {
    const current = await this.getOverrides();
    if (!newUrl || newUrl.trim() === '') {
      delete current[sourceId];
    } else {
      current[sourceId] = newUrl.trim();
    }

    await db
      .insert(settings)
      .values({
        key: 'data_source_overrides',
        value: current,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: current,
          updatedAt: new Date(),
        },
      });

    return current;
  }
}

export const dataSourceHealthService = new DataSourceHealthService();
