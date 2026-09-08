import { pgTable, serial, text, numeric, timestamp, varchar, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Settings table for storing configurations
export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Master Asset Dictionary
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // e.g. "THYAO", "USD/TRY", "FEDFUNDS"
  name: text('name').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'STOCK', 'CURRENCY', 'MACRO', etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Mapping assets to specific sources
export const assetMappings = pgTable('asset_mappings', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').references(() => assets.id).notNull(),
  source: varchar('source', { length: 50 }).notNull(), // 'YAHOO', 'TCMB', 'FRED'
  sourceCode: varchar('source_code', { length: 100 }).notNull(), // 'THYAO.IS', 'TP.DK.USD.A'
  createdAt: timestamp('created_at').defaultNow(),
});

// Unified data storage
export const assetData = pgTable('asset_data', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id').references(() => assets.id).notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  normalizedValue: numeric('normalized_value', { precision: 20, scale: 6 }),
  datePeriod: varchar('date_period', { length: 50 }),
  rawData: jsonb('raw_data'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Unmatched data for manual approval
export const unmatchedData = pgTable('unmatched_data', {
  id: serial('id').primaryKey(),
  source: varchar('source', { length: 50 }).notNull(),
  sourceCode: varchar('source_code', { length: 100 }).notNull(),
  rawData: jsonb('raw_data'),
  status: varchar('status', { length: 20 }).default('PENDING'), // PENDING, RESOLVED, IGNORED
  createdAt: timestamp('created_at').defaultNow(),
});

// Sync logs
export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  source: varchar('source', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // SUCCESS, ERROR
  recordsProcessed: integer('records_processed').default(0),
  message: text('message'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at').defaultNow(),
});

// Kapsamlı Sistem ve Hata Logları Tablosu (Enterprise Error & Audit Logs)
export const systemErrorLogs = pgTable('system_error_logs', {
  id: serial('id').primaryKey(),
  level: varchar('level', { length: 20 }).notNull().default('ERROR'), // 'FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'
  module: varchar('module', { length: 50 }).notNull().default('SYSTEM'), // 'DATABASE', 'API_GATEWAY', 'YAHOO_BIST', 'BINANCE_CRYPTO', 'TCMB_EVDS', 'TEFAS', 'KAP', 'SCHEDULER', 'AI_SERVICE', 'AUTH', 'TELEGRAM', 'SYSTEM'
  message: text('message').notNull(),
  stackTrace: text('stack_trace'),
  requestPath: varchar('request_path', { length: 255 }),
  requestMethod: varchar('request_method', { length: 20 }),
  clientIp: varchar('client_ip', { length: 100 }),
  statusCode: integer('status_code'),
  contextData: jsonb('context_data'),
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: varchar('resolved_by', { length: 100 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// KAP ve TEFAS için gerçek veritabanı tabloları
export const kapCompanies = pgTable('kap_companies', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 50 }).notNull().unique(),
  name: text('name').notNull(),
  sector: text('sector'),
  city: varchar('city', { length: 100 }),
  auditor: text('auditor'),
  address: text('address'),
});

export const kapDisclosures = pgTable('kap_disclosures', {
  id: serial('id').primaryKey(),
  disclosureIndex: varchar('disclosure_index', { length: 50 }).notNull().unique(),
  symbol: varchar('symbol', { length: 50 }),
  companyName: text('company_name'),
  title: text('title').notNull(),
  publishDate: timestamp('publish_date'),
  category: varchar('category', { length: 200 }),
  summary: text('summary'), // Yapay Zeka Özeti
  fullText: text('full_text'), // HTML veya saf metin (Kazınan büyük veri)
  hasAttachment: boolean('has_attachment').default(false),
  attachmentUrls: jsonb('attachment_urls'), // array of urls e.g., ["url1.pdf", "url2.xls"]
  relatedCompanies: jsonb('related_companies'), // array of strings
  impactLevel: varchar('impact_level', { length: 30 }), // 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'
  sentiment: varchar('sentiment', { length: 30 }), // 'POSITIVE', 'NEGATIVE', 'NEUTRAL'
  url: text('url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tefasFunds = pgTable('tefas_funds', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: text('name').notNull(),
  type: varchar('type', { length: 150 }), // Fonun Tipi ve Kategorisi
  managementFee: varchar('management_fee', { length: 50 }), // Yönetim Ücreti
  buyValour: varchar('buy_valour', { length: 50 }), // Alış Valörü
  sellValour: varchar('sell_valour', { length: 50 }), // Satış Valörü
  tradingHours: varchar('trading_hours', { length: 100 }), // İşlem Saatleri
  riskValue: varchar('risk_value', { length: 20 }), // Risk Değeri (1-7)
  isinCode: varchar('isin_code', { length: 50 }), // ISIN Kodu
  kapLink: text('kap_link'), // KAP Fon Bilgilendirme Linki
  minBuy: numeric('min_buy'), // Minimum Alış Tutarı / Adedi
  minSell: numeric('min_sell'), // Minimum Satış Tutarı / Adedi
  tefasStatus: varchar('tefas_status', { length: 100 }), // TEFAS İşlem Durumu
});

export const tefasPrices = pgTable('tefas_prices', {
  id: serial('id').primaryKey(),
  fundId: integer('fund_id').references(() => tefasFunds.id).notNull(),
  date: timestamp('date').notNull(),
  price: numeric('price', { precision: 20, scale: 6 }), // Güncel Pay Fiyatı
  dailyChange: numeric('daily_change', { precision: 10, scale: 4 }), // Fiyat Değişimi (%)
  marketCap: numeric('market_cap', { precision: 20, scale: 2 }), // Portföy Değeri
  shares: numeric('shares', { precision: 20, scale: 2 }), // Tedavüldeki Pay Sayısı
  investorCount: integer('investor_count'), // Yatırımcı Sayısı
  marketShare: numeric('market_share', { precision: 10, scale: 4 }), // Pazar Payı (%)
  volume: numeric('volume', { precision: 20, scale: 2 }), // Günlük İşlem Hacmi (TL)
  categoryRank: integer('category_rank'), // Kategori Derecesi / Sıralaması
  categoryTotal: integer('category_total'), // Kategori Toplam Fon Sayısı
  
  // Tarihsel Getiri Performansları
  return1W: numeric('return_1w', { precision: 10, scale: 4 }),
  return1M: numeric('return_1m', { precision: 10, scale: 4 }),
  return3M: numeric('return_3m', { precision: 10, scale: 4 }),
  return6M: numeric('return_6m', { precision: 10, scale: 4 }),
  return1Y: numeric('return_1y', { precision: 10, scale: 4 }),
  return3Y: numeric('return_3y', { precision: 10, scale: 4 }),
  return5Y: numeric('return_5y', { precision: 10, scale: 4 }),
  returnYTD: numeric('return_ytd', { precision: 10, scale: 4 }),

  // Portföy Dağılımı ve Varlık Yapısı
  assetAllocation: jsonb('asset_allocation'), // { "Hisse Senedi": 85.5, "Devlet Tahvili": 10.0, ... }
  benchmarkComparison: jsonb('benchmark_comparison'), // { "BIST100": ..., "USDTRY": ..., "EURTRY": ..., "GOLD": ..., "MEVDUAT": ..., "TUFE": ... }
  
  createdAt: timestamp('created_at').defaultNow(),
});

// --- TEFAS FON İÇİ BİREYSEL HİSSE & MENKUL KIYMET DETAYLARI (PORTFÖY DAĞILIM RAPORLARI) ---
export const tefasFundHoldings = pgTable('tefas_fund_holdings', {
  id: serial('id').primaryKey(),
  fundCode: varchar('fund_code', { length: 20 }).notNull(), // e.g., 'TCD', 'MAC', 'TI3', 'NNF'
  fundName: text('fund_name'),
  assetSymbol: varchar('asset_symbol', { length: 50 }).notNull(), // e.g. 'THYAO', 'TUPRS', 'BIMAS', 'NVDA'
  assetName: text('asset_name').notNull(),
  assetType: varchar('asset_type', { length: 100 }).notNull(), // 'Hisse Senedi (BIST)', 'Yabancı Hisse', 'Eurobond', 'Özel Sektör Tahvili', 'VİOP'
  weightPct: numeric('weight_pct', { precision: 8, scale: 4 }).notNull(), // % portföy ağırlığı
  nominalShares: numeric('nominal_shares', { precision: 24, scale: 2 }), // Pay Adedi
  marketValue: numeric('market_value', { precision: 24, scale: 2 }), // Piyasa Değeri (TL)
  sector: varchar('sector', { length: 100 }), // Sektör
  isinCode: varchar('isin_code', { length: 50 }),
  reportPeriod: varchar('report_period', { length: 50 }), // '2026/08' veya 'Son Portföy Dağılım Raporu'
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// --- TEFAS 5 YILLIK GÜNLÜK FİYAT / NAV ZAMAN SERİSİ ---
export const tefasHistoricalNavs = pgTable('tefas_historical_navs', {
  id: serial('id').primaryKey(),
  fundCode: varchar('fund_code', { length: 20 }).notNull(),
  date: timestamp('date').notNull(),
  price: numeric('price', { precision: 20, scale: 6 }).notNull(),
  marketCap: numeric('market_cap', { precision: 20, scale: 2 }),
  shares: numeric('shares', { precision: 20, scale: 2 }),
  investorCount: integer('investor_count'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- AKILLI VE KESİNTİLİ GEÇMİŞ VERİ YEDEKLEME / BACKFILL DURUMU ---
export const backfillSyncState = pgTable('backfill_sync_state', {
  taskName: varchar('task_name', { length: 100 }).primaryKey(), // 'TEFAS_5Y_DAILY_NAVS', 'BIST_5Y_DAILY_CANDLES'
  totalItems: integer('total_items').default(0),
  completedItems: integer('completed_items').default(0),
  currentItem: varchar('current_item', { length: 100 }),
  status: varchar('status', { length: 50 }).default('IDLE'), // 'IDLE', 'RUNNING', 'PAUSED_PEAK_HOURS', 'COMPLETED', 'ERROR'
  isWeekendMode: boolean('is_weekend_mode').default(false),
  lastError: text('last_error'),
  lastRunAt: timestamp('last_run_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bistStocks = pgTable('bist_stocks', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(), // e.g., THYAO
  companyName: text('company_name'),
  sector: text('sector'),
  price: numeric('price', { precision: 12, scale: 4 }),
  changePct: numeric('change_pct', { precision: 8, scale: 4 }),
  marketCap: numeric('market_cap', { precision: 20, scale: 4 }),
  volume: numeric('volume', { precision: 20, scale: 4 }),
  peRatio: numeric('pe_ratio', { precision: 10, scale: 4 }),
  pbRatio: numeric('pb_ratio', { precision: 10, scale: 4 }),
  evEbitda: numeric('ev_ebitda', { precision: 10, scale: 4 }),
  netDebtEbitda: numeric('net_debt_ebitda', { precision: 10, scale: 4 }),
  currentRatio: numeric('current_ratio', { precision: 10, scale: 4 }),
  roe: numeric('roe', { precision: 10, scale: 4 }),
  dividendYield: numeric('dividend_yield', { precision: 10, scale: 4 }),
  beta5y: numeric('beta_5y', { precision: 10, scale: 4 }),
  moneyInflowNetTry: numeric('money_inflow_net_try', { precision: 24, scale: 2 }),
  topBuyers: jsonb('top_buyers'),
  topSellers: jsonb('top_sellers'),
  fiftyTwoWeekHigh: numeric('fifty_two_week_high', { precision: 12, scale: 4 }),
  fiftyTwoWeekLow: numeric('fifty_two_week_low', { precision: 12, scale: 4 }),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// --- BIST FİNANSALLAR & BİLANÇO KALEMLERİ (36 SÜTUN KAP/TEMEL ANALİZ VERİTABANI) ---
export const bistFinancials = pgTable('bist_financials', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull(), // e.g., THYAO, EREGL, SISE
  year: integer('year').notNull(),
  period: integer('period').notNull(), // 3, 6, 9, 12
  announcedDate: varchar('announced_date', { length: 30 }),
  revenue: numeric('revenue', { precision: 24, scale: 2 }),
  revenueYoy: numeric('revenue_yoy', { precision: 10, scale: 4 }),
  grossProfit: numeric('gross_profit', { precision: 24, scale: 2 }),
  grossMargin: numeric('gross_margin', { precision: 10, scale: 4 }),
  operatingProfit: numeric('operating_profit', { precision: 24, scale: 2 }),
  operatingMargin: numeric('operating_margin', { precision: 10, scale: 4 }),
  ebitda: numeric('ebitda', { precision: 24, scale: 2 }),
  ebitdaMargin: numeric('ebitda_margin', { precision: 10, scale: 4 }),
  netProfit: numeric('net_profit', { precision: 24, scale: 2 }),
  netProfitYoy: numeric('net_profit_yoy', { precision: 10, scale: 4 }),
  netMargin: numeric('net_margin', { precision: 10, scale: 4 }),
  totalAssets: numeric('total_assets', { precision: 24, scale: 2 }),
  currentAssets: numeric('current_assets', { precision: 24, scale: 2 }),
  shortTermLiabilities: numeric('short_term_liabilities', { precision: 24, scale: 2 }),
  longTermLiabilities: numeric('long_term_liabilities', { precision: 24, scale: 2 }),
  netDebt: numeric('net_debt', { precision: 24, scale: 2 }),
  equity: numeric('equity', { precision: 24, scale: 2 }),
  workingCapital: numeric('working_capital', { precision: 24, scale: 2 }),
  freeCashFlow: numeric('free_cash_flow', { precision: 24, scale: 2 }),
  operatingCashFlow: numeric('operating_cash_flow', { precision: 24, scale: 2 }),
  capex: numeric('capex', { precision: 24, scale: 2 }),
  paidCapital: numeric('paid_capital', { precision: 24, scale: 2 }),
  retainedEarnings: numeric('retained_earnings', { precision: 24, scale: 2 }),
  disclosureId: varchar('disclosure_id', { length: 50 }),
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- ŞİRKET HİSSE GERİ ALIMLARI (SHARE BUYBACKS) ---
export const bistBuybacks = pgTable('bist_buybacks', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull(), // e.g. THYAO, SISE, SAHOL
  date: varchar('date', { length: 30 }).notNull(), // YYYY-MM-DD
  sharesBought: numeric('shares_bought', { precision: 24, scale: 2 }),
  pricePaid: numeric('price_paid', { precision: 16, scale: 4 }),
  totalTry: numeric('total_try', { precision: 24, scale: 2 }),
  cumulativeShares: numeric('cumulative_shares', { precision: 24, scale: 2 }),
  percentageOfCapital: numeric('percentage_of_capital', { precision: 10, scale: 4 }),
  programAuthorizedTry: numeric('program_authorized_try', { precision: 24, scale: 2 }),
  disclosureId: varchar('disclosure_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const macroIndicators = pgTable('macro_indicators', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: text('name').notNull(),
  source: varchar('source', { length: 20 }), // 'EVDS' or 'FRED'
  value: numeric('value', { precision: 16, scale: 4 }),
  unit: varchar('unit', { length: 20 }),
  datePeriod: varchar('date_period', { length: 50 }),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// --- KRIPTO & ON-CHAIN TABLOLARI (AKILLI ARTIMLI / DELTA SYNC DESTEKLİ) ---

export const cryptoCoins = pgTable('crypto_coins', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(), // BTC, ETH, SOL, AVAX, BNB, XRP
  name: text('name').notNull(),
  category: varchar('category', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cryptoPrices = pgTable('crypto_prices', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(),
  price: numeric('price', { precision: 20, scale: 4 }).notNull(),
  change24h: numeric('change_24h', { precision: 10, scale: 4 }),
  high24h: numeric('high_24h', { precision: 20, scale: 4 }),
  low24h: numeric('low_24h', { precision: 20, scale: 4 }),
  volume24h: numeric('volume_24h', { precision: 24, scale: 2 }),
  marketCap: numeric('market_cap', { precision: 24, scale: 2 }),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

export const cryptoCandles = pgTable('crypto_candles', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  timeframe: varchar('timeframe', { length: 10 }).notNull(), // '15m', '1h', '1d'
  time: timestamp('time').notNull(),
  open: numeric('open', { precision: 20, scale: 4 }).notNull(),
  high: numeric('high', { precision: 20, scale: 4 }).notNull(),
  low: numeric('low', { precision: 20, scale: 4 }).notNull(),
  close: numeric('close', { precision: 20, scale: 4 }).notNull(),
  volume: numeric('volume', { precision: 24, scale: 4 }),
  rsi14: numeric('rsi_14', { precision: 10, scale: 2 }), // Kod içinde hesaplanan RSI
  macd: numeric('macd', { precision: 12, scale: 4 }), // Kod içinde hesaplanan MACD
  macdSignal: numeric('macd_signal', { precision: 12, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cryptoOnChain = pgTable('crypto_on_chain', {
  id: serial('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  date: varchar('date', { length: 30 }).notNull(), // YYYY-MM-DD
  inOutMoneyPct: numeric('in_out_money_pct', { precision: 8, scale: 2 }), // Karda olan adres yüzdesi
  outMoneyPct: numeric('out_money_pct', { precision: 8, scale: 2 }), // Zararda olan adres yüzdesi
  largeTxsVolumeUsd: numeric('large_txs_volume_usd', { precision: 24, scale: 2 }), // Büyük balina transfer hacmi
  largeTxsCount: integer('large_txs_count'), // Büyük transfer adedi
  networkGrowthPct: numeric('network_growth_pct', { precision: 8, scale: 2 }), // Yeni adres artış oranı
  concentrationWhalesPct: numeric('concentration_whales_pct', { precision: 8, scale: 2 }), // Balina cüzdan konsantrasyonu
  sentimentScore: varchar('sentiment_score', { length: 30 }), // 'BULLISH', 'BEARISH', 'NEUTRAL'
  summaryText: text('summary_text'),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

export const cryptoNews = pgTable('crypto_news', {
  id: serial('id').primaryKey(),
  newsId: varchar('news_id', { length: 150 }).notNull().unique(),
  title: text('title').notNull(),
  body: text('body'),
  url: text('url'),
  source: varchar('source', { length: 100 }),
  publishedOn: timestamp('published_on').notNull(),
  categories: varchar('categories', { length: 200 }),
  sentiment: varchar('sentiment', { length: 20 }), // 'POSITIVE', 'NEGATIVE', 'NEUTRAL'
  createdAt: timestamp('created_at').defaultNow(),
});

export const marketNews = pgTable('market_news', {
  id: serial('id').primaryKey(),
  newsId: varchar('news_id', { length: 150 }).notNull().unique(),
  title: text('title').notNull(),
  body: text('body'),
  url: text('url'),
  source: varchar('source', { length: 100 }),
  publishedOn: timestamp('published_on').notNull(),
  categories: varchar('categories', { length: 200 }),
  sentiment: varchar('sentiment', { length: 20 }), // 'POSITIVE', 'NEGATIVE', 'NEUTRAL'
  createdAt: timestamp('created_at').defaultNow(),
});

export const ipos = pgTable('ipos', {
  id: serial('id').primaryKey(),
  companyCode: varchar('company_code', { length: 50 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'APPROVED', 'BOOK_BUILDING', 'LISTED', 'DRAFT'
  dateStr: varchar('date_str', { length: 100 }),
  countdownDays: integer('countdown_days'),
  price: varchar('price', { length: 100 }),
  lotSize: varchar('lot_size', { length: 100 }),
  sentiment: varchar('sentiment', { length: 50 }), // 'YÜKSEK POTANSİYEL', 'STANDART', 'RİSKLİ'
  aiSummary: text('ai_summary'),
  ipoSize: varchar('ipo_size', { length: 100 }),
  freeFloat: varchar('free_float', { length: 100 }),
  priceStability: varchar('price_stability', { length: 255 }),
  lockupCommitment: varchar('lockup_commitment', { length: 255 }),
  fundUsage: text('fund_usage'),
  discountRate: varchar('discount_rate', { length: 100 }),
  allocationGroups: text('allocation_groups'),
  currentPrice: varchar('current_price', { length: 50 }),
  dayChangePct: varchar('day_change_pct', { length: 50 }),
  ceilingStreak: integer('ceiling_streak'),
  maxCeilingStreak: integer('max_ceiling_streak'),
  brokeCeiling: boolean('broke_ceiling').default(false),
  breakDate: varchar('break_date', { length: 50 }),
  totalReturnPct: varchar('total_return_pct', { length: 50 }),
  tradingDays: integer('trading_days'),
  offerPrice: numeric('offer_price', { precision: 12, scale: 4 }),
  totalShares: numeric('total_shares', { precision: 24, scale: 2 }),
  ipoSizeTry: numeric('ipo_size_try', { precision: 24, scale: 2 }),
  dates: varchar('dates', { length: 150 }),
  distributionType: varchar('distribution_type', { length: 100 }),
  consortiumLeader: text('consortium_leader'),
  bistMarket: varchar('bist_market', { length: 100 }),
  peRatioIpo: numeric('pe_ratio_ipo', { precision: 10, scale: 4 }),
  prospectusUrl: text('prospectus_url'),
  fundUsageJson: jsonb('fund_usage_json'),
  allotmentResult: jsonb('allotment_result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cryptoSyncMetadata = pgTable('crypto_sync_metadata', {
  streamKey: varchar('stream_key', { length: 100 }).primaryKey(), // 'OHLCV_BTC_15M', 'PRICES_MULTI', etc.
  lastSyncAt: timestamp('last_sync_at').notNull(),
  lastDataTimestamp: timestamp('last_data_timestamp'),
  nextAllowedFetchAt: timestamp('next_allowed_fetch_at').notNull(),
  recordsAdded: integer('records_added').default(0),
  apiCallsSaved: integer('api_calls_saved').default(0), // Gereksiz API çağrısını engelleyen sayaç
  status: varchar('status', { length: 50 }).default('SYNCED'),
});

// --- ABD BORSALARI (US EQUITIES) EN BÜYÜK 1000 ŞİRKET MASTER VERİTABANI ---
export const usStocks = pgTable('us_stocks', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(), // AAPL, MSFT, NVDA, GOOGL, AMZN vb.
  companyName: text('company_name').notNull(),
  sector: varchar('sector', { length: 100 }), // Technology, Financial Services, Healthcare, vb.
  industry: varchar('industry', { length: 150 }), // Semiconductors, Software, Internet Retail vb.
  exchange: varchar('exchange', { length: 50 }).default('NASDAQ'), // NASDAQ, NYSE
  rank: integer('rank').default(1000), // Piyasa Değeri Sırası (1 - 1000)
  
  // Canlı & Fiyatlandırma Metrikleri
  price: numeric('price', { precision: 16, scale: 4 }), // Güncel Fiyat ($)
  changePct: numeric('change_pct', { precision: 10, scale: 4 }), // Günlük Değişim (%)
  change: numeric('change', { precision: 16, scale: 4 }), // Günlük Değişim ($)
  marketCap: numeric('market_cap', { precision: 24, scale: 2 }), // Piyasa Değeri ($)
  marketCapFormatted: varchar('market_cap_formatted', { length: 50 }), // "$3.45T", "$850.2B" vb.
  volume: numeric('volume', { precision: 24, scale: 2 }), // Günlük İşlem Hacmi
  avgVolume: numeric('avg_volume', { precision: 24, scale: 2 }), // 3 Aylık Ortalama Hacim
  
  // Temel Analiz & Değerleme Çarpanları
  peRatio: numeric('pe_ratio', { precision: 12, scale: 4 }), // F/K Oranı (Trailing P/E)
  forwardPe: numeric('forward_pe', { precision: 12, scale: 4 }), // İleri F/K (Forward P/E)
  pegRatio: numeric('peg_ratio', { precision: 12, scale: 4 }), // PEG Oranı
  priceToBook: numeric('price_to_book', { precision: 12, scale: 4 }), // PD/DD (P/B)
  priceToSales: numeric('price_to_sales', { precision: 12, scale: 4 }), // Fiyat / Satış (P/S)
  enterpriseValue: numeric('enterprise_value', { precision: 24, scale: 2 }), // Firma Değeri (EV)
  
  // Temettü & Kazanç Metrikleri
  dividendYield: numeric('dividend_yield', { precision: 10, scale: 4 }), // Temettü Verimi (%)
  dividendDate: varchar('dividend_date', { length: 50 }), // Temettü Tarihi
  eps: numeric('eps', { precision: 12, scale: 4 }), // Hisse Başına Kar (EPS Trailing)
  forwardEps: numeric('forward_eps', { precision: 12, scale: 4 }), // İleri EPS
  beta: numeric('beta', { precision: 10, scale: 4 }), // Beta Katsayısı (Volatilite)
  
  // 52 Haftalık & Hareketli Ortalama Aralıkları
  fiftyTwoWeekHigh: numeric('fifty_two_week_high', { precision: 16, scale: 4 }), // 52 Haftalık Zirve ($)
  fiftyTwoWeekLow: numeric('fifty_two_week_low', { precision: 16, scale: 4 }), // 52 Haftalık Dip ($)
  fiftyDayAverage: numeric('fifty_day_average', { precision: 16, scale: 4 }), // 50 Günlük HO ($)
  twoHundredDayAverage: numeric('two_hundred_day_average', { precision: 16, scale: 4 }), // 200 Günlük HO ($)
  
  // Analist Konsensüsü & Hedef Fiyatlar
  targetPrice: numeric('target_price', { precision: 16, scale: 4 }), // 12 Aylık Konsensüs Hedef Fiyat ($)
  recommendation: varchar('recommendation', { length: 50 }), // Strong Buy, Buy, Hold, Underperform, Sell
  analystRating: numeric('analyst_rating', { precision: 6, scale: 2 }), // 1.0 (Güçlü Al) - 5.0 (Sat)
  
  // Bilanço, Karlılık & Nakit Akışı Detayları
  revenue: numeric('revenue', { precision: 24, scale: 2 }), // Yıllık Ciro / Gelir ($)
  netIncome: numeric('net_income', { precision: 24, scale: 2 }), // Net Kar ($)
  profitMargin: numeric('profit_margin', { precision: 10, scale: 4 }), // Net Kar Marjı (%)
  operatingMargin: numeric('operating_margin', { precision: 10, scale: 4 }), // Faaliyet Kar Marjı (%)
  returnOnEquity: numeric('return_on_equity', { precision: 10, scale: 4 }), // Özsermaye Karlılığı - ROE (%)
  returnOnAssets: numeric('return_on_assets', { precision: 10, scale: 4 }), // Aktif Karlılığı - ROA (%)
  debtToEquity: numeric('debt_to_equity', { precision: 12, scale: 4 }), // Borç / Özsermaye Oranı
  freeCashFlow: numeric('free_cash_flow', { precision: 24, scale: 2 }), // Serbest Nakit Akışı ($)
  shortRatio: numeric('short_ratio', { precision: 10, scale: 4 }), // Short Oranı
  sharesOutstanding: numeric('shares_outstanding', { precision: 24, scale: 2 }), // Tedavüldeki Hisse Sayısı
  
  // Şirket Künyesi & İletişim Bilgileri
  country: varchar('country', { length: 50 }).default('United States'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  website: text('website'),
  ceo: text('ceo'),
  fullTimeEmployees: integer('full_time_employees'),
  description: text('description'), // Detaylı Şirket Faaliyet Özeti
  
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// --- BÜYÜK ABD ETF'LERİ (BROAD MARKET, TECH, TEMETTÜ, TAHVİL, EMTİA) MASTER TABLOSU ---
export const usEtfs = pgTable('us_etfs', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull().unique(), // SPY, QQQ, VOO, VTI, SCHD, TLT, GLD vb.
  name: text('name').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // Broad Market, Technology, Dividends, Fixed Income, Commodities, Thematic, Global
  issuer: varchar('issuer', { length: 100 }), // Vanguard, BlackRock / iShares, State Street SPDR, Invesco, Schwab, JPMorgan, VanEck vb.
  currency: varchar('currency', { length: 10 }).default('USD'),
  exchange: varchar('exchange', { length: 50 }).default('NYSE Arca'),

  // Fiyatlandırma & Büyüklük (USD $)
  price: numeric('price', { precision: 16, scale: 4 }), // Güncel Fiyat ($)
  changePct: numeric('change_pct', { precision: 10, scale: 4 }), // Günlük Değişim (%)
  change: numeric('change', { precision: 16, scale: 4 }), // Günlük Değişim ($)
  nav: numeric('nav', { precision: 16, scale: 4 }), // Net Asset Value ($)
  aum: numeric('aum', { precision: 24, scale: 2 }), // Fon Toplam Büyüklüğü ($)
  aumFormatted: varchar('aum_formatted', { length: 50 }), // "$560.4B", "$280.1B" vb.
  volume: numeric('volume', { precision: 24, scale: 2 }),
  avgVolume: numeric('avg_volume', { precision: 24, scale: 2 }),

  // Masraf, Getiri & Risk Metrikleri
  expenseRatio: numeric('expense_ratio', { precision: 8, scale: 4 }), // Yıllık Masraf Oranı (%) e.g. 0.03, 0.20
  dividendYield: numeric('dividend_yield', { precision: 8, scale: 4 }), // 30-Day SEC / Yıllık Temettü Verimi (%)
  distributionFrequency: varchar('distribution_frequency', { length: 50 }).default('Quarterly'), // Monthly, Quarterly, Annual
  beta: numeric('beta', { precision: 10, scale: 4 }), // S&P 500'e göre Beta
  sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }), // Sharpe Oranı (Risk Düzeltilmiş Getiri)
  trackingError: numeric('tracking_error', { precision: 8, scale: 4 }), // Takip Sapması (%)
  
  // Geçmiş Getiriler & Performans (CAGR %)
  return1y: numeric('return_1y', { precision: 10, scale: 4 }), // 1 Yıllık Getiri (%)
  return3y: numeric('return_3y', { precision: 10, scale: 4 }), // 3 Yıllık Yıllıklandırılmış Getiri (CAGR %)
  return5y: numeric('return_5y', { precision: 10, scale: 4 }), // 5 Yıllık Yıllıklandırılmış Getiri (CAGR %)
  inceptionDate: varchar('inception_date', { length: 50 }),
  fiftyTwoWeekHigh: numeric('fifty_two_week_high', { precision: 16, scale: 4 }),
  fiftyTwoWeekLow: numeric('fifty_two_week_low', { precision: 16, scale: 4 }),

  // Portföy Dağılımı & Ağırlıklar (JSON)
  benchmarkIndex: varchar('benchmark_index', { length: 150 }), // S&P 500 Index, Nasdaq 100 Index, Russell 2000 vb.
  holdingsCount: integer('holdings_count'), // Portföydeki toplam varlık sayısı
  topHoldings: jsonb('top_holdings'), // [{ symbol: 'AAPL', name: 'Apple Inc.', weight: 7.2 }, ...]
  sectorWeights: jsonb('sector_weights'), // [{ sector: 'Technology', weight: 31.5 }, ...]
  description: text('description'),

  lastUpdated: timestamp('last_updated').defaultNow(),
});

// --- 5 YILLIK GEÇMİŞ VERİ (5-YEAR HISTORICAL CANDLES & OHLCV DATA) ---
export const usHistoricalCandles = pgTable('us_historical_candles', {
  id: serial('id').primaryKey(),
  ticker: varchar('ticker', { length: 20 }).notNull(), // Ticker sembolü
  assetType: varchar('asset_type', { length: 20 }).notNull(), // 'STOCK' veya 'ETF'
  currency: varchar('currency', { length: 10 }).default('USD'),
  period: varchar('period', { length: 20 }).default('DAILY'), // 'DAILY', 'WEEKLY', 'MONTHLY'
  date: varchar('date', { length: 30 }).notNull(), // YYYY-MM-DD
  timestamp: timestamp('timestamp').notNull(),
  open: numeric('open', { precision: 16, scale: 4 }).notNull(),
  high: numeric('high', { precision: 16, scale: 4 }).notNull(),
  low: numeric('low', { precision: 16, scale: 4 }).notNull(),
  close: numeric('close', { precision: 16, scale: 4 }).notNull(),
  volume: numeric('volume', { precision: 24, scale: 2 }).default('0'),
  peRatio: numeric('pe_ratio', { precision: 12, scale: 4 }),
  dividendYield: numeric('dividend_yield', { precision: 10, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- ANALİST YORUMLARI & ARAŞTIRMA RAPORLARI (BIST, ABD, TEFAS, KRİPTO + YZ SENTEZ KATMANI) ---
export const analystReports = pgTable('analyst_reports', {
  id: serial('id').primaryKey(),
  market: varchar('market', { length: 20 }).notNull(), // 'BIST', 'US', 'TEFAS', 'CRYPTO'
  source: varchar('source', { length: 50 }).notNull(), // 'KAP_RESEARCH', 'IS_YATIRIM', 'MIDAS', 'PARABORSA', 'INVESTING_TR', 'IS_PORTFOY', 'AK_PORTFOY', 'YAPI_KREDI_PORTFOY', 'FINNHUB', 'SEEKING_ALPHA', 'MARKETWATCH', 'BENZINGA', 'CRYPTOPANIC', 'COINDESK', 'LUNARCRUSH'
  sourceName: varchar('source_name', { length: 100 }).notNull(), // 'İş Yatırım', 'KAP Araştırma', 'ParaBorsa / Halk Yatırım', 'Midas Kulakları', 'Ak Portföy Strateji', 'Benzinga Ratings', 'CoinDesk Research'
  sourceUrl: text('source_url'),
  author: varchar('author', { length: 100 }), // Analist veya Kurum adı
  ticker: varchar('ticker', { length: 30 }).notNull(), // 'THYAO', 'NVDA', 'BTC', 'TCD', 'BIST100', 'SPX'
  assetName: text('asset_name'), // Türk Hava Yolları, Nvidia Corp, Bitcoin vb.
  title: text('title').notNull(),
  rawContent: text('raw_content'), // Ham toplanan analist metni (Telif/ToS için DB'de tutulur, dışarıya sadece YZ sentezi açılır)
  recommendation: varchar('recommendation', { length: 30 }).default('TUT'), // 'AL', 'TUT', 'SAT', 'OVERWEIGHT', 'NEUTRAL', 'UNDERWEIGHT', 'BULLISH', 'BEARISH'
  targetPrice: numeric('target_price', { precision: 16, scale: 4 }), // Hedef Fiyat (TL veya USD)
  currentPriceAtReport: numeric('current_price_at_report', { precision: 16, scale: 4 }),
  upsidePct: numeric('upside_pct', { precision: 8, scale: 2 }), // % Potansiyel Getiri
  currency: varchar('currency', { length: 10 }).default('TRY'), // 'TRY', 'USD', 'USDT'
  publishDate: timestamp('publish_date').notNull(),
  
  // Telif ve ToS Korumalı Yapay Zeka Sentez Alanları
  aiSummary: text('ai_summary'), // YZ tarafından oluşturulan 2-3 cümlelik özlü sentez
  aiSentiment: varchar('ai_sentiment', { length: 20 }).default('NÖTR'), // 'POZİTİF', 'NÖTR', 'NEGATİF'
  aiSentimentScore: numeric('ai_sentiment_score', { precision: 6, scale: 3 }), // -1.000 ile +1.000 arası
  keyBullArguments: jsonb('key_bull_arguments'), // ["Güçlü yolcu doluluk oranı", "Kargo gelirlerindeki artış"]
  keyBearRisks: jsonb('key_bear_risks'), // ["Jeopolitik gerilimler", "Akaryakıt maliyet baskısı"]
  isSynthesized: boolean('is_synthesized').default(false),
  synthesizedAt: timestamp('synthesized_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

