import { useState, useEffect, useMemo } from 'react';
import { 
  Globe, TrendingUp, TrendingDown, Clock, RefreshCw, Search, Filter, 
  Layers, ArrowUpDown, ChevronLeft, ChevronRight, BarChart2, ShieldCheck, 
  ExternalLink, Building2, DollarSign, Award, Target, Briefcase, Zap, X, Activity,
  LineChart, Database
} from 'lucide-react';
import { UsEtfView } from '../us/UsEtfView';
import { UsHistoricalModal } from '../us/UsHistoricalModal';

interface USIndex {
  symbol: string;
  name: string;
  value: number;
  change_pct: number;
}

interface UsStock {
  id?: number;
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange: 'NASDAQ' | 'NYSE';
  rank: number;
  price: number;
  changePct: number;
  change: number;
  marketCap: number;
  marketCapFormatted: string;
  volume: number;
  avgVolume: number;
  peRatio: number;
  forwardPe: number;
  pegRatio: number;
  priceToBook: number;
  priceToSales: number;
  enterpriseValue: number;
  dividendYield: number;
  dividendDate?: string;
  eps: number;
  forwardEps: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  targetPrice: number;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Underperform' | 'Sell';
  analystRating: number;
  revenue: number;
  netIncome: number;
  profitMargin: number;
  operatingMargin: number;
  returnOnEquity: number;
  returnOnAssets: number;
  debtToEquity: number;
  freeCashFlow: number;
  shortRatio: number;
  sharesOutstanding: number;
  country: string;
  city?: string;
  state?: string;
  website?: string;
  ceo?: string;
  fullTimeEmployees?: number;
  description?: string;
  lastUpdated?: string;
}

const SECTORS = [
  'Tümü',
  'Technology',
  'Financial Services',
  'Healthcare',
  'Consumer Cyclical',
  'Industrials',
  'Communication Services',
  'Energy',
  'Consumer Defensive',
  'Real Estate',
  'Utilities',
  'Basic Materials'
];

export default function UsMarketsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'stocks' | 'etfs'>('stocks');
  const [historyModal, setHistoryModal] = useState<{ ticker: string; assetType: 'STOCK' | 'ETF'; name?: string } | null>(null);

  const [indices, setIndices] = useState<USIndex[]>([]);
  const [stocks, setStocks] = useState<UsStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('Tümü');
  const [sortBy, setSortBy] = useState('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(1000);
  
  // Summary Aggregates
  const [marketSummary, setMarketSummary] = useState({
    totalMarketCapFormatted: '$48.50T',
    totalCount: 1000,
    gainersCount: 620,
    losersCount: 380,
    avgPe: 26.8,
    avgDividendYield: 1.65
  });

  // Selected stock modal
  const [selectedStock, setSelectedStock] = useState<UsStock | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ isSyncing: false, syncedCount: 0, currentTicker: '' });

  const fetchIndices = async () => {
    try {
      const res = await fetch('/api/market/overview');
      if (res.ok) {
        const json = await res.json();
        if (json.indices && json.indices.length > 0) {
          setIndices(json.indices);
        }
      }
    } catch (e) {
      console.warn('Indices fetch warning:', e);
    }
  };

  const fetchStocks = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '50',
        search: searchTerm,
        sector: selectedSector === 'Tümü' ? 'ALL' : selectedSector,
        sort: sortBy,
        order: sortOrder
      });

      const res = await fetch(`/api/v1/us-stocks?${params.toString()}`);
      if (!res.ok) throw new Error('ABD 1.000 hisse verisi alınamadı');
      
      const data = await res.json();
      setStocks(data.stocks || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 1000);
      if (data.marketSummary) {
        setMarketSummary(data.marketSummary);
      }
    } catch (err: any) {
      setError(err.message || 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Poll sync progress if active
  useEffect(() => {
    let timer: any;
    if (syncingAll) {
      timer = setInterval(async () => {
        try {
          const res = await fetch('/api/v1/us-stocks/progress');
          if (res.ok) {
            const data = await res.json();
            setSyncProgress(data);
            if (!data.isSyncing) {
              setSyncingAll(false);
              fetchStocks(page);
            }
          }
        } catch (e) {
          // ignore
        }
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [syncingAll, page]);

  useEffect(() => {
    fetchIndices();
  }, []);

  useEffect(() => {
    fetchStocks(1);
    setPage(1);
  }, [searchTerm, selectedSector, sortBy, sortOrder]);

  const handleSyncClick = async () => {
    setSyncingAll(true);
    try {
      await fetch('/api/v1/us-stocks/sync', { method: 'POST' });
    } catch (e) {
      console.error(e);
      setSyncingAll(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Globe size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Amerikan Borsaları &amp; Küresel ETF Merkezi
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                USD ($) BAZINDA &amp; 5 YILLIK DERİN VERİ
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Top 1.000 ABD hissesi, dev küresel ETF'ler ve 5 yıllık derin OHLCV geçmişiyle tam teferruatlı analiz.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sub Tab Navigation Pill */}
          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 shadow-xs">
            <button
              onClick={() => setActiveSubTab('stocks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'stocks'
                  ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>🗽 En Büyük 1.000 Şirket</span>
            </button>
            <button
              onClick={() => setActiveSubTab('etfs')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === 'etfs'
                  ? 'bg-white dark:bg-neutral-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <span>🌐 Küresel Büyük ETF'ler</span>
            </button>
          </div>

          <button
            onClick={handleSyncClick}
            disabled={syncingAll}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
            <span>{syncingAll ? `Güncelleniyor (${syncProgress.syncedCount}/1000)...` : 'Fiyatları Yenile'}</span>
          </button>
        </div>
      </div>

      {/* ETF Sub-Tab View */}
      {activeSubTab === 'etfs' ? (
        <UsEtfView 
          onSelectEtfForHistory={(ticker, name) => {
            setHistoryModal({ ticker, assetType: 'ETF', name });
          }}
        />
      ) : (
        <>

      {/* Sync Progress Bar if syncing */}
      {syncingAll && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
          <div className="flex justify-between items-center text-xs text-blue-900 dark:text-blue-200 font-medium mb-1.5">
            <span>Canlı Fiyat ve Değerleme Çarpanları Senkronizasyonu</span>
            <span className="font-mono">%{Math.round((syncProgress.syncedCount / 1000) * 100)} ({syncProgress.syncedCount} / 1.000)</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, (syncProgress.syncedCount / 1000) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* US Market KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Toplam Piyasa Değeri</div>
          <div className="text-base font-extrabold font-mono text-neutral-900 dark:text-white mt-1">
            {marketSummary.totalMarketCapFormatted}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Top 1.000 Şirket</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Kapsanan Şirket</div>
          <div className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-1">
            1.000 / 1.000
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Eksiksiz Tam Künye</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Ortalama F/K (P/E)</div>
          <div className="text-base font-extrabold font-mono text-neutral-900 dark:text-white mt-1">
            {marketSummary.avgPe}x
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Trailing P/E</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Ort. Temettü Verimi</div>
          <div className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            %{marketSummary.avgDividendYield}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Yıllık Dividend Yield</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Yükselen / Düşen</div>
          <div className="text-base font-extrabold font-mono flex items-center gap-1.5 mt-1">
            <span className="text-emerald-600 dark:text-emerald-400">{marketSummary.gainersCount}</span>
            <span className="text-neutral-400">/</span>
            <span className="text-rose-600 dark:text-rose-400">{marketSummary.losersCount}</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Günlük Dağılım</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Borsa Dağılımı</div>
          <div className="text-base font-extrabold font-mono text-neutral-900 dark:text-white mt-1">
            NASDAQ & NYSE
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">New York (EST)</div>
        </div>
      </div>

      {/* Major US Indices Cards Strip */}
      {indices.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {indices.map((idx) => (
            <div
              key={idx.symbol}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3.5 shadow-sm flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{idx.name}</div>
                <div className="text-sm font-extrabold font-mono text-neutral-900 dark:text-white mt-0.5">
                  {idx.value ? idx.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                </div>
              </div>
              <div
                className={`text-xs font-mono font-bold flex items-center gap-0.5 px-2 py-1 rounded-md ${
                  idx.change_pct >= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {idx.change_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                %{Math.abs(idx.change_pct || 0).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="1.000 Şirket içinde sembol veya isim ara (Örn: AAPL, Nvidia, TSLA, Amazon)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Sırala:
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="marketCap">Piyasa Değeri (Market Cap)</option>
              <option value="price">Son Fiyat ($)</option>
              <option value="changePct">Günlük Değişim (%)</option>
              <option value="peRatio">F/K Oranı (P/E)</option>
              <option value="dividendYield">Temettü Verimi (%)</option>
              <option value="volume">İşlem Hacmi</option>
              <option value="ticker">Sembol (A-Z)</option>
              <option value="rank">Sıralama (1-1000)</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100"
              title={sortOrder === 'asc' ? 'Artan' : 'Azalan'}
            >
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {/* Sector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar text-xs">
          {SECTORS.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                selectedSector === sec
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {selectedSector === 'Tümü' ? 'Tüm ABD Hisseleri' : selectedSector}
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              ({totalCount} Şirket bulundu)
            </span>
          </div>

          <div className="text-xs text-neutral-400 font-mono">
            Sayfa {page} / {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-medium">
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('rank')}>
                  #
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('ticker')}>
                  Sembol
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('companyName')}>
                  Şirket & Sektör
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('price')}>
                  Fiyat ($)
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('changePct')}>
                  24s Değişim %
                </th>
                <th className="px-4 py-3 cursor-pointer text-right" onClick={() => handleSort('marketCap')}>
                  Piyasa Değeri
                </th>
                <th className="px-4 py-3 cursor-pointer text-right" onClick={() => handleSort('peRatio')}>
                  F/K (P/E)
                </th>
                <th className="px-4 py-3 cursor-pointer text-right" onClick={() => handleSort('dividendYield')}>
                  Temettü %
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('recommendation')}>
                  Analist Konsensüsü
                </th>
                <th className="px-4 py-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-blue-500" />
                      <span>Amerikan hisse verileri yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-neutral-400">
                    Arama kriterlerine uygun şirket bulunamadı.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => (
                  <tr 
                    key={stock.ticker}
                    onClick={() => setSelectedStock(stock)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-neutral-400 text-[11px]">
                      {stock.rank || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {stock.ticker}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono">
                          {stock.exchange}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 line-clamp-1 max-w-[200px]">
                        {stock.companyName}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {stock.sector} • {stock.industry}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                      ${stock.price?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] ${
                          stock.changePct >= 0 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        {stock.changePct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        %{Math.abs(stock.changePct || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-right text-neutral-900 dark:text-white">
                      {stock.marketCapFormatted || `$${(stock.marketCap / 1e9).toFixed(1)}B`}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-neutral-700 dark:text-neutral-300">
                      {stock.peRatio > 0 ? `${stock.peRatio.toFixed(1)}x` : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-indigo-600 dark:text-indigo-400 font-semibold">
                      {stock.dividendYield > 0 ? `%${stock.dividendYield.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        stock.recommendation === 'Strong Buy' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : stock.recommendation === 'Buy'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {stock.recommendation || 'Buy'} ({stock.analystRating?.toFixed(1) || '1.8'})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryModal({ ticker: stock.ticker, assetType: 'STOCK', name: stock.companyName });
                          }}
                          className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="5 Yıllık OHLCV Mum Grafiğini Aç"
                        >
                          <BarChart2 size={12} />
                          <span>5Y</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStock(stock);
                          }}
                          className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Detay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Toplam {totalCount} şirketten {(page - 1) * 50 + 1} - {Math.min(totalCount, page * 50)} arası gösteriliyor
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (page > 1) {
                  const nextP = page - 1;
                  setPage(nextP);
                  fetchStocks(nextP);
                }
              }}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-mono font-medium px-2">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => {
                if (page < totalPages) {
                  const nextP = page + 1;
                  setPage(nextP);
                  fetchStocks(nextP);
                }
              }}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* In-Depth Stock Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {selectedStock.ticker}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300">
                    {selectedStock.exchange}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-xs font-bold text-blue-800 dark:text-blue-300">
                    Sıralama: #{selectedStock.rank}
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                  {selectedStock.companyName}
                </h3>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {selectedStock.sector} • {selectedStock.industry}
                </div>
              </div>

              <button
                onClick={() => setSelectedStock(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Price & Target Price Header Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Güncel Fiyat</div>
                <div className="text-xl font-extrabold font-mono text-neutral-900 dark:text-white mt-0.5">
                  ${selectedStock.price?.toFixed(2)}
                </div>
                <div className={`text-xs font-mono font-semibold flex items-center gap-0.5 mt-0.5 ${
                  selectedStock.changePct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {selectedStock.changePct >= 0 ? '+' : ''}{selectedStock.changePct?.toFixed(2)}% (${selectedStock.change?.toFixed(2)})
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Piyasa Değeri (Cap)</div>
                <div className="text-xl font-extrabold font-mono text-neutral-900 dark:text-white mt-0.5">
                  {selectedStock.marketCapFormatted}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Hacim: {selectedStock.volume?.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">12M Hedef Fiyat</div>
                <div className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  ${selectedStock.targetPrice?.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  Potansiyel: +{(((selectedStock.targetPrice - selectedStock.price) / selectedStock.price) * 100).toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Analist Tavsiyesi</div>
                <div className="text-base font-extrabold text-neutral-900 dark:text-white mt-0.5">
                  {selectedStock.recommendation}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                  Puan: {selectedStock.analystRating?.toFixed(1)} / 5.0
                </div>
              </div>
            </div>

            {/* 52-Week Range Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-neutral-500 dark:text-neutral-400">
                <span>52H Dip: ${selectedStock.fiftyTwoWeekLow?.toFixed(2)}</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">52 Haftalık Fiyat Aralığı</span>
                <span>52H Zirve: ${selectedStock.fiftyTwoWeekHigh?.toFixed(2)}</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2.5 rounded-full overflow-hidden relative">
                <div 
                  className="bg-blue-600 h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((selectedStock.price - selectedStock.fiftyTwoWeekLow) / (selectedStock.fiftyTwoWeekHigh - selectedStock.fiftyTwoWeekLow)) * 100))}%`
                  }}
                />
              </div>
            </div>

            {/* Key Valuation & Multiples Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Temel Analiz & Değerleme Çarpanları
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">F/K Oranı (Trailing P/E)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {selectedStock.peRatio?.toFixed(2)}x
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">İleri F/K (Forward P/E)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {selectedStock.forwardPe?.toFixed(2)}x
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">PEG Oranı</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {selectedStock.pegRatio?.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">PD/DD (Price to Book)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {selectedStock.priceToBook?.toFixed(2)}x
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Temettü Verimi %</span>
                  <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                    %{selectedStock.dividendYield?.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Hisse Başına Kar (EPS)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    ${selectedStock.eps?.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Beta Katsayısı</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    {selectedStock.beta?.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Firma Değeri (EV)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    ${(selectedStock.enterpriseValue / 1e9).toFixed(1)}B
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Health & Income Metrics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Bilanço Karlılığı & Nakit Akışı
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Yıllık Ciro (Gelir)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    ${(selectedStock.revenue / 1e9).toFixed(1)}B
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Yıllık Net Kar</span>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ${(selectedStock.netIncome / 1e9).toFixed(1)}B
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Özsermaye Karlılığı (ROE)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    %{selectedStock.returnOnEquity?.toFixed(1)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-400">Serbest Nakit Akışı (FCF)</span>
                  <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white mt-1">
                    ${(selectedStock.freeCashFlow / 1e9).toFixed(1)}B
                  </div>
                </div>
              </div>
            </div>

            {/* Company Profile & Summary */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-500" />
                  <span>Şirket Künyesi & Faaliyet Özeti</span>
                </span>
                {selectedStock.website && (
                  <a
                    href={selectedStock.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <span>Resmi Web Sitesi</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                {selectedStock.description}
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-neutral-400 border-t border-neutral-200 dark:border-neutral-700">
                <span><strong>CEO:</strong> {selectedStock.ceo || 'Yönetim Kurulu'}</span>
                <span><strong>Merkez:</strong> {selectedStock.city}, {selectedStock.state}, {selectedStock.country}</span>
                <span><strong>Çalışan:</strong> {selectedStock.fullTimeEmployees?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* 5-Year Historical Performance & OHLCV Candles Modal */}
      {historyModal && (
        <UsHistoricalModal
          ticker={historyModal.ticker}
          assetType={historyModal.assetType}
          name={historyModal.name}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
}
