import { publicApiService } from './PublicApiService.ts';
import { bistUniverseService } from './BistUniverseService.ts';
import { usUniverseService } from './UsUniverseService.ts';
import { usHistoricalService } from './UsHistoricalService.ts';
import { tefasHoldingsService } from './TefasHoldingsService.ts';
import { analystCommentaryService } from './AnalystCommentaryService.ts';
import { assetHubService } from './AssetHubService.ts';
import { comprehensiveDataService } from './ComprehensiveDataIntegrationService.ts';
import { cryptoService } from './CryptoService.ts';
import { marketService } from './MarketService.ts';

export interface AgentToolDefinition {
  name: string;
  description: string;
  category: 'BIST' | 'TEFAS' | 'US_MARKETS' | 'KAP' | 'CRYPTO' | 'MACRO' | 'ANALYST' | '360_ASSETS';
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
}

export class AgentIntegrationService {
  private tools: AgentToolDefinition[] = [
    {
      name: 'bist_get_stocks',
      description: 'Borsa İstanbul (BIST) 625+ hisse senedinin canlı fiyat, F/K, piyasa değeri ve değişim verilerini arama ve listeleme.',
      category: 'BIST',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Hisse kodu veya şirket adı (örn: THYAO, Türk Hava)' },
          page: { type: 'number', description: 'Sayfa numarası (varsayılan: 1)' },
          limit: { type: 'number', description: 'Sayfa başı veri adedi (varsayılan: 50, max: 500)' },
          sortBy: { type: 'string', enum: ['marketCap', 'price', 'changePct', 'volume', 'peRatio', 'ticker'], description: 'Sıralama kriteri' }
        }
      }
    },
    {
      name: 'bist_get_stock_detail',
      description: 'Tek bir BIST hissesinin detaylı profili, 52 haftalık aralıkları ve güncel metrikleri.',
      category: 'BIST',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'BIST Hisse Kodu (örn: THYAO, GARAN, ASELS)' }
        },
        required: ['ticker']
      }
    },
    {
      name: 'bist_get_stock_history',
      description: 'BIST hissesinin 5 yıllık günlük Açılış, Yüksek, Düşük, Kapanış, Düzeltilmiş Kapanış ve Hacim (OHLCV) zaman serisi.',
      category: 'BIST',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Hisse kodu (örn: THYAO)' },
          limit: { type: 'number', description: 'Döndürülecek mum adedi (varsayılan: 500, max: 2000)' }
        },
        required: ['ticker']
      }
    },
    {
      name: 'bist_get_indicators',
      description: 'Hisse senedi için hesaplanmış teknik analiz indikatörleri: RSI(14), SMA20, SMA50, SMA200, Bollinger Bantları ve Trend Yönü.',
      category: 'BIST',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Hisse kodu (örn: EREGL)' }
        },
        required: ['ticker']
      }
    },
    {
      name: 'tefas_get_funds',
      description: '1.063+ TEFAS Yatırım Fonunun güncel birim fiyatı, 1M/1Y/5Y getirileri, risk değeri ve kategorisi.',
      category: 'TEFAS',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Fon kodu veya adı (örn: TCD, İş Portföy)' },
          category: { type: 'string', description: 'Fon kategorisi' },
          limit: { type: 'number', description: 'Veri limiti' }
        }
      }
    },
    {
      name: 'tefas_get_fund_holdings',
      description: 'Yatırım fonunun KAP bildirimine göre portföyünde tuttuğu hisse senetleri ve ağırlık yüzdeleri (% PDR).',
      category: 'TEFAS',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Fon Kodu (örn: TI2, TCD, IIH)' }
        },
        required: ['code']
      }
    },
    {
      name: 'tefas_find_funds_by_stock',
      description: 'Belirtilen BIST hissesini (örn: THYAO) portföyünde en yüksek oranda taşıyan TEFAS fonları.',
      category: 'TEFAS',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'BIST hisse kodu (örn: THYAO)' }
        },
        required: ['ticker']
      }
    },
    {
      name: 'us_get_stocks',
      description: 'ABD Borsalarındaki (NYSE & NASDAQ) Top 1.000 Şirket ve En Büyük ETF\'lerin canlı fiyatları.',
      category: 'US_MARKETS',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Şirket/ETF kodu veya adı (örn: NVDA, AAPL, SPY)' },
          sector: { type: 'string', description: 'Sektör filtresi' }
        }
      }
    },
    {
      name: 'us_get_history',
      description: 'ABD Şirketi veya ETF\'i için 5 Yıllık OHLCV, CAGR ve Maksimum Drawdown zaman serisi.',
      category: 'US_MARKETS',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['stock', 'etf'], description: 'Varlık tipi' },
          ticker: { type: 'string', description: 'ABD kodu (örn: NVDA)' }
        },
        required: ['type', 'ticker']
      }
    },
    {
      name: 'get_kap_disclosures',
      description: 'KAP (Kamuyu Aydınlatma Platformu) anlık özel durum açıklamaları akışı ve AI özetleri.',
      category: 'KAP',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'İsteğe bağlı hisse kodu filtresi (örn: SASA)' },
          limit: { type: 'number', description: 'Getirilecek haber sayısı' }
        }
      }
    },
    {
      name: 'get_analyst_reports',
      description: 'Kurumsal aracı kurumların BIST ve ABD hisseleri için hedef fiyatları ve AI konsensüs analizi.',
      category: 'ANALYST',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'Hisse kodu (örn: TUPRS)' },
          market: { type: 'string', enum: ['BIST', 'US', 'ALL'], description: 'Piyasa seçimi' }
        }
      }
    },
    {
      name: 'get_crypto_prices',
      description: 'BTC, ETH ve majör kripto varlıkların canlı Binance tırnakları, mum verileri ve On-Chain sinyalleri.',
      category: 'CRYPTO',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Kripto çifti (örn: BTCUSDT, ETHUSDT)' }
        }
      }
    },
    {
      name: 'get_macro_data',
      description: 'TCMB EVDS ve FRED kaynaklı Makro Ekonomik Göstergeler (Enflasyon, Politika Faizi, Dolar/TL, ABD 10Y).',
      category: 'MACRO',
      parameters: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_asset_360_profile',
      description: 'Bir varlığın (hisse/fon) canlı fiyatını, taşıyan fonları, KAP haberlerini ve tekniklerini birleştiren 360° profil.',
      category: '360_ASSETS',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Varlık Kodu (örn: THYAO)' }
        },
        required: ['code']
      }
    }
  ];

  public getToolsList(): AgentToolDefinition[] {
    return this.tools;
  }

  /**
   * Executes a specific tool by name with parameters
   */
  public async executeTool(toolName: string, params: Record<string, any> = {}): Promise<any> {
    const startTime = performance.now();
    try {
      let result: any = null;

      switch (toolName) {
        case 'bist_get_stocks':
          result = await publicApiService.getBistStocks({
            search: params.search,
            page: params.page ? Number(params.page) : 1,
            limit: params.limit ? Number(params.limit) : 50,
            sortBy: params.sortBy || 'marketCap',
            order: 'desc'
          });
          break;

        case 'bist_get_stock_detail':
          if (!params.ticker) throw new Error('ticker parametresi zorunludur.');
          result = await publicApiService.getBistStockDetail(params.ticker);
          break;

        case 'bist_get_stock_history':
          if (!params.ticker) throw new Error('ticker parametresi zorunludur.');
          result = await publicApiService.getBistStockHistory(params.ticker, undefined, undefined, params.limit ? Number(params.limit) : 500);
          break;

        case 'bist_get_indicators':
          if (!params.ticker) throw new Error('ticker parametresi zorunludur.');
          result = await publicApiService.getStockTechnicalIndicators(params.ticker);
          break;

        case 'tefas_get_funds':
          result = await publicApiService.getTefasFunds({
            search: params.search,
            category: params.category,
            page: 1,
            limit: params.limit ? Number(params.limit) : 50
          });
          break;

        case 'tefas_get_fund_holdings':
          if (!params.code) throw new Error('code parametresi zorunludur.');
          result = await tefasHoldingsService.getFundHoldings(params.code);
          break;

        case 'tefas_find_funds_by_stock':
          if (!params.ticker) throw new Error('ticker parametresi zorunludur.');
          result = await tefasHoldingsService.getFundsHoldingStock(params.ticker);
          break;

        case 'us_get_stocks':
          result = await usUniverseService.getStocks({
            search: params.search,
            sector: params.sector,
            page: 1,
            limit: params.limit ? Number(params.limit) : 50
          });
          break;

        case 'us_get_history':
          if (!params.ticker) throw new Error('ticker parametresi zorunludur.');
          result = await usHistoricalService.fetch5YearHistory(params.ticker);
          break;

        case 'get_kap_disclosures':
          result = await publicApiService.getKapDisclosures({
            ticker: params.ticker,
            page: 1,
            limit: params.limit ? Number(params.limit) : 30
          });
          break;

        case 'get_analyst_reports':
          result = await analystCommentaryService.getReports({
            market: params.market || 'ALL',
            ticker: params.ticker
          });
          break;

        case 'get_crypto_prices':
          if (params.symbol) {
            result = await cryptoService.getCandles(params.symbol, '1d');
          } else {
            result = await cryptoService.getLivePrices();
          }
          break;

        case 'get_macro_data':
          result = await marketService.getLiveMarketOverview();
          break;

        case 'get_asset_360_profile':
          if (!params.code) throw new Error('code parametresi zorunludur.');
          result = await assetHubService.getUnifiedAssetProfile(params.code);
          break;

        default:
          throw new Error(`Bilinmeyen agent aracı (tool): '${toolName}'`);
      }

      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        tool: toolName,
        executionTimeMs,
        timestamp: new Date().toISOString(),
        result
      };
    } catch (error: any) {
      return {
        success: false,
        tool: toolName,
        error: error.message || String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generates OpenClaw Agent Protocol Manifest
   */
  public getOpenClawManifest(baseUrl: string = 'http://localhost:3000') {
    return {
      name: 'MarketPulse FinHub OpenClaw Integration',
      version: '1.0.0',
      description: 'BIST 625+ Hisse, TEFAS 1.063+ Fon, ABD Top 1.000, KAP ve Makro verilerine erişim sağlayan otonom AI ajan entegrasyon protokolü.',
      protocol: 'openclaw-agent-v1',
      author: 'MarketPulse AI Team',
      authentication: {
        type: 'apiKey_or_bearer',
        supportedHeaders: ['X-API-Key', 'Authorization'],
        bearerFormat: 'Bearer <API_KEY_or_JWT>',
        queryParam: 'api_key',
        authCheckUrl: `${baseUrl}/api/v1/health`
      },
      capabilities: {
        toolsCount: this.tools.length,
        mcpSupported: true,
        realtimeSseSupported: true,
        sseStreamUrl: `${baseUrl}/api/v1/events/stream`
      },
      endpoints: {
        toolsList: `${baseUrl}/api/v1/agent/tools`,
        toolExecution: `${baseUrl}/api/v1/agent/execute`,
        mcpJsonRpc: `${baseUrl}/api/v1/agent/mcp`,
        openApiSpec: `${baseUrl}/api/v1/openapi.json`
      },
      tools: this.tools
    };
  }

  /**
   * Generates Harness Workflow Agent Manifest
   */
  public getHarnessManifest(baseUrl: string = 'http://localhost:3000') {
    return {
      harnessPluginVersion: '1.0.0',
      serviceName: 'MarketPulse Financial Intelligence Engine',
      category: 'FINANCIAL_DATA_AND_AI_ANALYTICS',
      auth: {
        scheme: 'X-API-Key or Bearer',
        headers: {
          'X-API-Key': '${secrets.getValue("MARKETPULSE_API_KEY")}',
          'Authorization': 'Bearer ${secrets.getValue("MARKETPULSE_API_KEY")}'
        }
      },
      actions: this.tools.map(t => ({
        id: t.name,
        displayName: t.name.replace(/_/g, ' ').toUpperCase(),
        description: t.description,
        endpoint: `${baseUrl}/api/v1/agent/execute`,
        method: 'POST',
        defaultPayload: {
          tool: t.name,
          parameters: {}
        },
        inputSchema: t.parameters
      }))
    };
  }

  /**
   * MCP (Model Context Protocol) JSON-RPC 2.0 Request Handler
   */
  public async handleMcpRequest(reqBody: any): Promise<any> {
    const jsonrpc = reqBody?.jsonrpc || '2.0';
    const id = reqBody?.id ?? null;
    const method = reqBody?.method;

    if (method === 'tools/list') {
      return {
        jsonrpc,
        id,
        result: {
          tools: this.tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.parameters
          }))
        }
      };
    }

    if (method === 'tools/call') {
      const name = reqBody?.params?.name;
      const args = reqBody?.params?.arguments || reqBody?.params?.parameters || {};

      if (!name) {
        return {
          jsonrpc,
          id,
          error: { code: -32602, message: 'Invalid params: tool name is required' }
        };
      }

      const execRes = await this.executeTool(name, args);
      if (!execRes.success) {
        return {
          jsonrpc,
          id,
          error: { code: -32000, message: execRes.error }
        };
      }

      return {
        jsonrpc,
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(execRes.result, null, 2)
            }
          ]
        }
      };
    }

    return {
      jsonrpc,
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
  }
}

export const agentIntegrationService = new AgentIntegrationService();
