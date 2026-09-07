import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, RefreshCw, TrendingUp, TrendingDown, 
  Layers, Filter, ArrowUpDown, PieChart, ShieldCheck, 
  BarChart2, Award, Zap, ChevronLeft, ChevronRight, DollarSign 
} from 'lucide-react';
import { UsEtfData } from '../../services/usEtfData';

interface UsEtfViewProps {
  onSelectEtfForHistory: (ticker: string, name: string) => void;
}

const ETF_CATEGORIES = [
  'Tümü',
  'Broad Market Index',
  'Tech & Growth',
  'Dividend & Value',
  'Bonds & Fixed Income',
  'Commodities & Precious Metals',
  'Crypto & Bitcoin',
  'Sector & Semiconductors',
  'International & Emerging',
  'Small Cap'
];

export const UsEtfView: React.FC<UsEtfViewProps> = ({ onSelectEtfForHistory }) => {
  const [etfs, setEtfs] = useState<UsEtfData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [sortBy, setSortBy] = useState('aum');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedEtfModal, setSelectedEtfModal] = useState<UsEtfData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [marketSummary, setMarketSummary] = useState({
    totalAumFormatted: '$8.25T',
    totalCount: 30,
    avgExpenseRatio: 0.22,
    avgDividendYield: 2.14,
    topCategory: 'Broad Market Index'
  });

  const fetchEtfs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search: searchTerm,
        category: selectedCategory === 'Tümü' ? 'ALL' : selectedCategory,
        sort: sortBy,
        order: sortOrder
      });

      const res = await fetch(`/api/v1/us-etfs?${params.toString()}`);
      if (!res.ok) throw new Error('ETF verileri alınamadı');
      const data = await res.json();
      setEtfs(data.etfs || []);
      if (data.marketSummary) {
        setMarketSummary(data.marketSummary);
      }
    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEtfs();
  }, [searchTerm, selectedCategory, sortBy, sortOrder, page]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/v1/us-etfs/sync', { method: 'POST' });
      await fetchEtfs();
    } catch (err) {
      console.warn('ETF sync err:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div id="us-etf-view" className="space-y-6">
      {/* Top Banner KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-semibold">Toplam ETF Varlık (AUM)</span>
            <Globe size={16} className="text-teal-500" />
          </div>
          <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white mt-1">
            {marketSummary.totalAumFormatted}
          </div>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 block">
            USD Bazında Küresel Fon Büyüklüğü
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-semibold">İzlenen Büyük ETF Sayısı</span>
            <Layers size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white mt-1">
            {marketSummary.totalCount} Fon
          </div>
          <span className="text-[11px] text-neutral-400 font-medium mt-0.5 block">
            SPY, QQQ, VOO, SCHD, TLT, GLD, IBIT...
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-semibold">Ortalama Masraf Oranı (TER)</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            %{marketSummary.avgExpenseRatio}%
          </div>
          <span className="text-[11px] text-neutral-400 font-medium mt-0.5 block">
            Yıllık Düşük Yönetim Ücreti
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-semibold">Ortalama Temettü Verimi</span>
            <DollarSign size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            %{marketSummary.avgDividendYield}%
          </div>
          <span className="text-[11px] text-neutral-400 font-medium mt-0.5 block">
            USD Nakit Temettü Dağıtımı
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="ETF kodu (SPY, QQQ, SCHD), fon adı veya ihraççı (Vanguard, BlackRock) ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:outline-hidden focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter size={15} className="text-neutral-400 shrink-0 ml-1" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
          >
            {ETF_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Güncelleniyor...' : 'ETF Fiyatlarını Yenile'}</span>
          </button>
        </div>
      </div>

      {/* ETF Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="p-3.5 pl-4">ETF & İhraççı</th>
                <th className="p-3.5">Kategori & Endeks</th>
                <th className="p-3.5 cursor-pointer select-none hover:text-teal-600" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">
                    <span>Fiyat (USD)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer select-none hover:text-teal-600" onClick={() => handleSort('changePct')}>
                  <div className="flex items-center gap-1">
                    <span>Günlük %</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer select-none hover:text-teal-600" onClick={() => handleSort('aum')}>
                  <div className="flex items-center gap-1">
                    <span>AUM (Fon Büyüklüğü)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer select-none hover:text-teal-600" onClick={() => handleSort('expenseRatio')}>
                  <div className="flex items-center gap-1">
                    <span>Masraf (TER)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer select-none hover:text-teal-600" onClick={() => handleSort('dividendYield')}>
                  <div className="flex items-center gap-1">
                    <span>Temettü %</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer select-none hover:text-teal-600" onClick={() => handleSort('return5y')}>
                  <div className="flex items-center gap-1">
                    <span>5 Yıllık Getiri</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3.5 pr-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-neutral-400">
                    <RefreshCw size={24} className="animate-spin text-teal-500 mx-auto mb-2" />
                    <span>Büyük ETF verileri taranıyor...</span>
                  </td>
                </tr>
              ) : etfs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    Arama kriterlerinize uygun ETF bulunamadı.
                  </td>
                </tr>
              ) : (
                etfs.map((etf) => (
                  <tr 
                    key={etf.ticker}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-mono font-bold text-xs">
                          {etf.ticker.slice(0, 3)}
                        </div>
                        <div>
                          <div className="font-bold font-mono text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <span>{etf.ticker}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                              {etf.exchange}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 max-w-[200px]">
                            {etf.name} ({etf.issuer})
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
                        {etf.category}
                      </span>
                      <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                        {etf.benchmarkIndex}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-neutral-900 dark:text-white">
                      ${etf.price?.toFixed(2)}
                    </td>

                    <td className="p-3.5 font-mono font-semibold">
                      <span className={`inline-flex items-center gap-0.5 ${
                        etf.changePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {etf.changePct >= 0 ? '+' : ''}{etf.changePct?.toFixed(2)}%
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      {etf.aumFormatted}
                    </td>

                    <td className="p-3.5 font-mono text-neutral-600 dark:text-neutral-400">
                      %{etf.expenseRatio?.toFixed(2)}
                    </td>

                    <td className="p-3.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      %{etf.dividendYield?.toFixed(2)}
                    </td>

                    <td className="p-3.5 font-mono font-bold">
                      <span className={etf.return5y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                        +{etf.return5y?.toFixed(1)}%
                      </span>
                    </td>

                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 5Y Chart Trigger */}
                        <button
                          onClick={() => onSelectEtfForHistory(etf.ticker, etf.name)}
                          className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="5 Yıllık Geçmiş Grafiği Aç"
                        >
                          <BarChart2 size={13} />
                          <span>5Y Grafik</span>
                        </button>

                        {/* Detail Modal Trigger */}
                        <button
                          onClick={() => setSelectedEtfModal(etf)}
                          className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
      </div>

      {/* ETF Full Detail Modal */}
      {selectedEtfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col p-5 sm:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 font-mono font-extrabold text-base">
                  {selectedEtfModal.ticker}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {selectedEtfModal.name}
                  </h3>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    İhraççı: {selectedEtfModal.issuer} • Borsa: {selectedEtfModal.exchange} • Para Birimi: USD ($)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEtfModal(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div>
                <span className="text-xs text-neutral-400">Fon Fiyatı (NAV)</span>
                <div className="text-xl font-extrabold font-mono text-neutral-900 dark:text-white mt-0.5">
                  ${selectedEtfModal.price?.toFixed(2)}
                </div>
                <span className={`text-xs font-semibold ${selectedEtfModal.changePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {selectedEtfModal.changePct >= 0 ? '+' : ''}{selectedEtfModal.changePct?.toFixed(2)}%
                </span>
              </div>

              <div>
                <span className="text-xs text-neutral-400">Toplam Varlık (AUM)</span>
                <div className="text-xl font-extrabold font-mono text-teal-600 dark:text-teal-400 mt-0.5">
                  {selectedEtfModal.aumFormatted}
                </div>
                <span className="text-[11px] text-neutral-400">
                  {selectedEtfModal.holdingsCount} Varlık / Hisse
                </span>
              </div>

              <div>
                <span className="text-xs text-neutral-400">Masraf Oranı (TER)</span>
                <div className="text-xl font-extrabold font-mono text-neutral-900 dark:text-white mt-0.5">
                  %{selectedEtfModal.expenseRatio?.toFixed(2)}
                </div>
                <span className="text-[11px] text-neutral-400">Yıllık Fon Gideri</span>
              </div>

              <div>
                <span className="text-xs text-neutral-400">Temettü Dağıtımı</span>
                <div className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                  %{selectedEtfModal.dividendYield?.toFixed(2)}
                </div>
                <span className="text-[11px] text-neutral-400">{selectedEtfModal.distributionFrequency}</span>
              </div>
            </div>

            {/* Top 5 Holdings */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                En Büyük İlk 5 Portföy Varlığı (Top Holdings)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(selectedEtfModal.topHoldings || []).map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
                    <span className="font-bold text-neutral-900 dark:text-white">{h.ticker} - {h.name}</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">%{h.weight}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <strong>Fon Açıklaması:</strong> {selectedEtfModal.description}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => {
                  const ticker = selectedEtfModal.ticker;
                  const name = selectedEtfModal.name;
                  setSelectedEtfModal(null);
                  onSelectEtfForHistory(ticker, name);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <BarChart2 size={14} />
                <span>5 Yıllık OHLCV Mum Grafiğini Aç</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
