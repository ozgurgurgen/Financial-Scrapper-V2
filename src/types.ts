export type TabType = 
  | 'services'
  | 'live-office'
  | 'dataflow'
  | 'data-health'
  | 'funds'
  | 'fund-holdings'
  | 'market'
  | 'crypto'
  | 'crypto-all'
  | 'kap'
  | 'ipo'
  | 'news'
  | 'schedule'
  | 'technical'
  | 'screener'
  | 'macro'
  | 'calendar'
  | 'buffett'
  | 'analyst'
  | 'us'
  | 'api'
  | 'api-charts'
  | 'system-logs'
  | 'db_stocks'
  | 'settings'
  | 'assets'
  | 'sector-analytics';

export type NewsCategory = 'ALL' | 'BIST' | 'EKONOMI' | 'GLOBAL' | 'KRIPTO' | 'HALKA_ARZ';

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  url: string;
  source: string;
  publishedOn: string;
  category: NewsCategory;
  sentiment: 'POZİTİF' | 'NÖTR' | 'NEGATİF';
  isIpo?: boolean;
  companyCode?: string;
}

export interface NewsSummaryData {
  total: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  positiveRatioPct: number;
  categoryCounts: {
    all: number;
    bist: number;
    ekonomi: number;
    global: number;
    crypto: number;
    halka_arz: number;
  };
  lastUpdated: string;
}

export interface ServiceStatus {
  key: string;
  name: string;
  icon: string;
  port: number;
  color: string;
  desc: string;
  schedule: string;
  running: boolean;
  scraping: boolean;
  last_run: string | null;
  last_status: 'SUCCESS' | 'FAILED' | 'RUNNING' | null;
  last_run_records?: number;
  current_module?: string;
  current_fund?: string;
  ban_level?: number;
  total_429s?: number;
  slowdown_factor?: number;
  ban_message?: string;
  companies?: number;
  financials?: number;
  disclosures?: number;
  corporate_actions?: number;
  share_buybacks?: number;
  ipo_data?: number;
  shareholders?: number;
  cashflows?: number;
  management?: number;
  subsidiaries?: number;
  funds?: number;
  prices?: number;
}

export interface ProgressInfo {
  percent: number;
  eta_seconds: number;
  phase: string;
  detail: string;
}

export interface KapModule {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export interface PipelineRunItem {
  id: string;
  service_name: string;
  module_name: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  records_inserted: number;
  started_at: string;
  finished_at: string | null;
}

export interface TefasFundItem {
  code: string;
  title: string;
  kind: string;
  category: string;
  current_price: number;
  market_cap: number;
  investor_count: number;
  stock_pct: number;
  total_records: number;
  first_date: string;
  last_date: string;
  total_return_pct: number;
  annualized_return_pct: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  first_price: number;
  price_history: { date: string; price: number; volume?: number }[];
}

export interface KapCompanyItem {
  ticker: string;
  company_name: string;
  sector: string;
  market: string;
  price: number;
  market_cap: number;
  pe_ratio: number;
  pb_ratio: number;
  dividend_yield: number;
  day_change_pct: number;
  financials: {
    year: number;
    period: string;
    revenue: number;
    net_profit: number;
    ebitda: number;
    total_assets: number;
    total_debts: number;
    equity: number;
  }[];
  cashflows: {
    year: number;
    period: string;
    operating_cash_flow: number;
    investing_cash_flow: number;
    financing_cash_flow: number;
    net_change: number;
  }[];
  shareholders: {
    holder_name: string;
    share_ratio_percent: number;
    holder_type: string;
    is_qualified?: boolean;
  }[];
  management: {
    name: string;
    title: string;
    member_type: string;
  }[];
  disclosures: {
    publish_date: string;
    title: string;
    category: string;
    source_url?: string;
    is_catalyst?: boolean;
  }[];
  buybacks: {
    total_budget_tl: number;
    max_shares: number;
    total_bought_shares: number;
    capital_ratio_percent: number;
    avg_buyback_price: number;
  }[];
  corporate_actions: {
    action_type: string;
    gross_per_share: number;
    net_per_share: number;
    yield_percent: number;
    ex_date: string;
    payment_date: string;
    status: string;
  }[];
  subsidiaries: {
    name: string;
    share_percent: number;
  }[];
  ipo?: {
    ipo_date: string;
    ipo_price: number;
    discount_ratio: number;
    distribution_type: string;
    use_of_funds_investment_pct: number;
    use_of_funds_r_d_pct: number;
    use_of_funds_working_capital_pct: number;
    use_of_funds_debt_pct: number;
  }[];
  price_history: {
    trade_date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

export interface KapDisclosureItem {
  id: string;
  symbol: string;
  title: string;
  category: string;
  publish_date: string;
  is_catalyst: boolean;
  source_url?: string;
}

export interface MarketRateItem {
  symbol: string;
  name: string;
  value: number;
  change_pct?: number;
}

export interface VapIndicatorItem {
  name: string;
  value: number | string;
  category: string;
}

export interface TechnicalAnalysisResult {
  ticker: string;
  price: number;
  overall_signal: string;
  trend: 'Yukselis' | 'Dusus' | 'Yatay';
  rsi: {
    value: number;
    signal: string;
  };
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    signal_text: string;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    position: string;
  };
  supertrend: {
    direction: 'Yukselis' | 'Dusus';
    value: number;
  };
  pivots: {
    R3: number;
    R2: number;
    R1: number;
    PP: number;
    S1: number;
    S2: number;
    S3: number;
  };
  moving_averages: {
    sma_5: number;
    sma_10: number;
    sma_20: number;
    sma_50: number;
    sma_200: number;
    ema_12: number;
    ema_26: number;
  };
  chart_data: {
    dates: string[];
    closes: number[];
    upper_band: number[];
    lower_band: number[];
    sma20: number[];
    rsi_vals: number[];
    macd_vals: number[];
    signal_vals: number[];
  };
}

export interface ScreenerItem {
  ticker: string;
  company_name: string;
  price: number;
  change_pct: number;
  rsi: number;
  macd: number;
  volume: number;
  sector: string;
}

export interface MacroInflationItem {
  date: string;
  yearly: number;
  monthly: number;
}

export interface EconomicCalendarItem {
  id: string;
  date: string;
  time: string;
  country_code: string;
  event_name: string;
  importance: 'high' | 'medium' | 'low';
  actual: string;
  forecast: string;
  previous: string;
}

export interface BuffettAnalysisResult {
  ticker: string;
  price: number;
  rating: string;
  buffett_score: number;
  market_cap: number;
  oe_yield: number;
  safety_margin: number;
  owner_earnings: {
    net_income: number;
    depreciation: number;
    capex: number;
    value: number;
  };
  dcf: {
    nominal_rate: number;
    inflation: number;
    real_rate: number;
    growth_rate: number;
    forecast_years: number;
    intrinsic_per_share: number;
  };
  key_ratios: {
    roe: number;
    roa: number;
    pe_ratio: number;
    pb_ratio: number;
    profit_margins: number;
    operating_margins: number;
    revenue_growth: number;
    dividend_yield: number;
  };
}

export interface UsStockItem {
  ticker: string;
  name: string;
  currency: string;
  price: number;
  sector: string;
  industry: string;
  pe: number;
  pb: number;
  roe: number;
  beta: number;
  dividend_yield: number;
  market_cap: number;
  '52w_high': number;
  '52w_low': number;
}

export interface ApiEndpointItem {
  path: string;
  method: string;
  description: string;
  category: string;
  sample_response: any;
}

export interface BuffettScoreItem {
  ticker: string;
  company_name: string;
  score: number;
  price: number;
  intrinsic_value: number;
  margin_of_safety_pct: number;
  moat: string;
  roe_3yr_avg: number;
  debt_to_equity: number;
  pe_ratio: number;
  criteria: {
    name: string;
    target: string;
    actual: string;
    passed: boolean;
  }[];
}

export interface CalendarEventItem {
  id: string;
  date: string;
  time: string;
  country: string;
  event_name: string;
  importance: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface MacroIndicatorItem {
  name: string;
  category: string;
  value: number;
  previous_value: number;
  unit: string;
  period: string;
  change_pct: number;
}

export type AnalystMarketType = 'ALL' | 'BIST' | 'US' | 'TEFAS' | 'CRYPTO';

export interface AnalystReportItem {
  id: number;
  market: 'BIST' | 'US' | 'TEFAS' | 'CRYPTO';
  source: string;
  sourceName: string;
  sourceUrl?: string;
  author?: string;
  ticker: string;
  assetName?: string;
  title: string;
  recommendation: 'AL' | 'TUT' | 'SAT' | 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT' | 'BULLISH' | 'BEARISH' | string;
  targetPrice?: number;
  currentPriceAtReport?: number;
  upsidePct?: number;
  currency: string;
  publishDate: string;
  
  // Telif / ToS Güvenli YZ Sentez Çıkarımları
  aiSummary: string;
  aiSentiment: 'POZİTİF' | 'NÖTR' | 'NEGATİF';
  aiSentimentScore: number;
  keyBullArguments: string[];
  keyBearRisks: string[];
  isSynthesized: boolean;
  synthesizedAt?: string;
}

export interface AnalystMarketConsensus {
  totalReports: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  bullishRatioPct: number;
  averageUpsidePct: number;
  topRecommendedTickers: {
    ticker: string;
    assetName: string;
    market: string;
    buyCount: number;
    avgTargetPrice?: number;
    avgUpsidePct?: number;
    dominantSentiment: 'POZİTİF' | 'NÖTR' | 'NEGATİF';
  }[];
  sourcesCount: number;
  lastUpdated: string;
}

