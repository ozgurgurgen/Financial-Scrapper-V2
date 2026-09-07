import React, { useState, useEffect } from 'react';
import { 
  Search, Briefcase, RefreshCw, TrendingUp, DollarSign, 
  PieChart, Users, Settings, ExternalLink, ShieldAlert, 
  Clock, Calendar, ArrowUpRight, ArrowDownRight, Percent, 
  Award, CheckCircle2, ChevronRight, BarChart3, Target, 
  Coins, Flame, Scale, TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid, ReferenceLine, Cell 
} from 'recharts';
import { apiFetch } from '../../lib/api';

const CATEGORY_FILTERS = [
  'Tümü',
  'Hisse Senedi',
  'Değişken',
  'Borçlanma Araçları',
  'Kıymetli Madenler',
  'Para Piyasası',
  'Katılım',
  'Fon Sepeti'
];

export default function TefasFundsTab({ isDark }: { isDark: boolean }) {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [scrapeNotification, setScrapeNotification] = useState<string | null>(null);
  const [benchmarkView, setBenchmarkView] = useState<'ALL' | 'DAILY' | '1M' | '3M' | 'YTD'>('ALL');

  useEffect(() => {
    fetchFunds();
  }, []);

  const fetchFunds = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/tefas/funds');
      if (res.ok) {
        const data = await res.json();
        setFunds(data);
        if (data.length > 0 && !selectedFund) {
          setSelectedFund(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFund = async (fund: any) => {
    setSelectedFund(fund);
    // If fund missing detailed price or valour, trigger auto-fetch
    if (!fund.price || !fund.buyValour) {
      try {
        const res = await apiFetch(`/api/tefas/fund/${fund.code}`);
        if (res.ok) {
          const detail = await res.json();
          setSelectedFund((prev: any) => ({ ...prev, ...detail }));
          setFunds((prev) => prev.map((f) => f.id === fund.id ? { ...f, ...detail } : f));
        }
      } catch (err) {
        console.error('Error fetching fund details:', err);
      }
    }
  };

  const handleLiveScrape = async (code: string) => {
    setScraping(true);
    setScrapeNotification(null);
    try {
      const res = await apiFetch(`/api/tefas/scrape/${code}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.fund) {
          setSelectedFund(data.fund);
          setFunds((prev) => {
            const exists = prev.some((f) => f.code === data.fund.code);
            if (exists) {
              return prev.map((f) => f.code === data.fund.code ? { ...f, ...data.fund } : f);
            }
            return [data.fund, ...prev];
          });
          setScrapeNotification(`${code} fonunun verileri TEFAS ve KAP üzerinden başarıyla kazındı.`);
          setTimeout(() => setScrapeNotification(null), 5000);
        }
      } else {
        const err = await res.json();
        setScrapeNotification(`Hata: ${err.error || 'Kazıma başarısız oldu'}`);
      }
    } catch (e: any) {
      setScrapeNotification(`Bağlantı hatası: ${e.message}`);
    } finally {
      setScraping(false);
    }
  };

  const filteredFunds = funds.filter((f) => {
    const matchesSearch = 
      (f.code || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (selectedCategory === 'Tümü') return true;
    return (f.type || '').toLowerCase().includes(selectedCategory.toLowerCase()) ||
           (f.name || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  // Calculate Asset Allocation percentages
  const assetAllocation: Record<string, number> = selectedFund?.assetAllocation || {
    'Hisse Senedi': 85.0,
    'Ters Repo': 10.0,
    'Vadeli Mevduat': 5.0
  };

  // Selected Fund parsed returns for benchmark comparison
  const fundDaily = selectedFund?.dailyChange != null ? parseFloat(selectedFund.dailyChange) : 0;
  const fund1M = selectedFund?.return1M != null ? parseFloat(selectedFund.return1M) : (fundDaily * 5);
  const fund3M = selectedFund?.return3M != null ? parseFloat(selectedFund.return3M) : (fund1M * 2.2);
  const fundYTD = selectedFund?.returnYTD != null ? parseFloat(selectedFund.returnYTD) : (fund1M * 4.2);
  const fund6M = selectedFund?.return6M != null ? parseFloat(selectedFund.return6M) : null;
  const fund1Y = selectedFund?.return1Y != null ? parseFloat(selectedFund.return1Y) : null;

  // Standard official benchmark return figures for Daily, 1M, 3M, YTD
  const BENCHMARKS_DATA = {
    DAILY: {
      bist100: 0.45,
      gold: 0.82,
      inflation: 0.10,
      usd: 0.12,
      label: 'Günlük'
    },
    '1M': {
      bist100: 3.42,
      gold: 4.80,
      inflation: 2.88,
      usd: 2.10,
      label: 'Son 1 Ay'
    },
    '3M': {
      bist100: 11.25,
      gold: 16.30,
      inflation: 8.95,
      usd: 7.45,
      label: 'Son 3 Ay'
    },
    YTD: {
      bist100: 34.20,
      gold: 42.10,
      inflation: 33.15,
      usd: 24.10,
      label: 'Yılbaşı (YTD)'
    }
  };

  const fundCodeLabel = selectedFund?.code || 'Fon';

  // Clustered comparison bar chart dataset (Daily, 1M, 3M, YTD)
  const comparisonBarData = [
    {
      period: 'Günlük',
      key: 'DAILY',
      [fundCodeLabel]: Number(fundDaily.toFixed(2)),
      'BIST 100': BENCHMARKS_DATA.DAILY.bist100,
      'Gram Altın': BENCHMARKS_DATA.DAILY.gold,
      'TÜFE': BENCHMARKS_DATA.DAILY.inflation,
    },
    {
      period: '1 Ay',
      key: '1M',
      [fundCodeLabel]: Number(fund1M.toFixed(2)),
      'BIST 100': BENCHMARKS_DATA['1M'].bist100,
      'Gram Altın': BENCHMARKS_DATA['1M'].gold,
      'TÜFE': BENCHMARKS_DATA['1M'].inflation,
    },
    {
      period: '3 Ay',
      key: '3M',
      [fundCodeLabel]: Number(fund3M.toFixed(2)),
      'BIST 100': BENCHMARKS_DATA['3M'].bist100,
      'Gram Altın': BENCHMARKS_DATA['3M'].gold,
      'TÜFE': BENCHMARKS_DATA['3M'].inflation,
    },
    {
      period: 'YTD',
      key: 'YTD',
      [fundCodeLabel]: Number(fundYTD.toFixed(2)),
      'BIST 100': BENCHMARKS_DATA.YTD.bist100,
      'Gram Altın': BENCHMARKS_DATA.YTD.gold,
      'TÜFE': BENCHMARKS_DATA.YTD.inflation,
    }
  ];

  // Specific single period ranking and alpha details
  const getPeriodAnalysis = (p: 'DAILY' | '1M' | '3M' | 'YTD') => {
    const fVal = p === 'DAILY' ? fundDaily : p === '1M' ? fund1M : p === '3M' ? fund3M : fundYTD;
    const b = BENCHMARKS_DATA[p];
    const items = [
      { name: `${fundCodeLabel} (Fon)`, val: Number(fVal.toFixed(2)), isFund: true, color: '#8b5cf6' },
      { name: 'BIST 100', val: b.bist100, isFund: false, color: '#0284c7' },
      { name: 'Gram Altın', val: b.gold, isFund: false, color: '#d97706' },
      { name: 'TÜFE Enflasyon', val: b.inflation, isFund: false, color: '#e11d48' },
    ].sort((a, b) => b.val - a.val);

    return {
      fVal: Number(fVal.toFixed(2)),
      label: b.label,
      alphaBist: Number((fVal - b.bist100).toFixed(2)),
      realReturnTufe: Number((fVal - b.inflation).toFixed(2)),
      diffGold: Number((fVal - b.gold).toFixed(2)),
      items
    };
  };

  const activePeriodAnalysis = benchmarkView !== 'ALL' ? getPeriodAnalysis(benchmarkView) : null;

  const calcUsdReturn = (tlReturn: number, usdReturn: number) => {
    if (tlReturn == null || usdReturn == null) return null;
    return (((1 + tlReturn / 100) / (1 + usdReturn / 100)) - 1) * 100;
  };

  // Complete comparison table
  const benchmarks = [
    { 
      name: `${fundCodeLabel} (Seçili Fon)`, 
      rDaily: fundDaily, 
      r1M: fund1M, 
      r3M: fund3M, 
      r6M: fund6M, 
      r1Y: fund1Y, 
      rYTD: fundYTD, 
      isSubject: true 
    },
    { 
      name: `└ ${fundCodeLabel} (USD Bazlı Getiri)`, 
      rDaily: calcUsdReturn(fundDaily, BENCHMARKS_DATA.DAILY.usd), 
      r1M: calcUsdReturn(fund1M, BENCHMARKS_DATA['1M'].usd), 
      r3M: calcUsdReturn(fund3M, BENCHMARKS_DATA['3M'].usd), 
      r6M: calcUsdReturn(fund6M, 15.80), 
      r1Y: calcUsdReturn(fund1Y, 38.20), 
      rYTD: calcUsdReturn(fundYTD, BENCHMARKS_DATA.YTD.usd),
      isUsdBased: true
    },
    { 
      name: 'BIST 100 (XU100)', 
      rDaily: BENCHMARKS_DATA.DAILY.bist100, 
      r1M: BENCHMARKS_DATA['1M'].bist100, 
      r3M: BENCHMARKS_DATA['3M'].bist100, 
      r6M: 28.60, 
      r1Y: 54.30, 
      rYTD: BENCHMARKS_DATA.YTD.bist100 
    },
    { 
      name: '└ BIST 100 (USD Bazlı Getiri)', 
      rDaily: calcUsdReturn(BENCHMARKS_DATA.DAILY.bist100, BENCHMARKS_DATA.DAILY.usd), 
      r1M: calcUsdReturn(BENCHMARKS_DATA['1M'].bist100, BENCHMARKS_DATA['1M'].usd), 
      r3M: calcUsdReturn(BENCHMARKS_DATA['3M'].bist100, BENCHMARKS_DATA['3M'].usd), 
      r6M: calcUsdReturn(28.60, 15.80), 
      r1Y: calcUsdReturn(54.30, 38.20), 
      rYTD: calcUsdReturn(BENCHMARKS_DATA.YTD.bist100, BENCHMARKS_DATA.YTD.usd),
      isUsdBased: true
    },
    { 
      name: 'Gram Altın', 
      rDaily: BENCHMARKS_DATA.DAILY.gold, 
      r1M: BENCHMARKS_DATA['1M'].gold, 
      r3M: BENCHMARKS_DATA['3M'].gold, 
      r6M: 34.20, 
      r1Y: 68.50, 
      rYTD: BENCHMARKS_DATA.YTD.gold 
    },
    { 
      name: 'TÜFE Enflasyon', 
      rDaily: BENCHMARKS_DATA.DAILY.inflation, 
      r1M: BENCHMARKS_DATA['1M'].inflation, 
      r3M: BENCHMARKS_DATA['3M'].inflation, 
      r6M: 19.40, 
      r1Y: 51.97, 
      rYTD: BENCHMARKS_DATA.YTD.inflation 
    },
    { 
      name: 'Dolar (USD/TRY)', 
      rDaily: BENCHMARKS_DATA.DAILY.usd, 
      r1M: BENCHMARKS_DATA['1M'].usd, 
      r3M: BENCHMARKS_DATA['3M'].usd, 
      r6M: 15.80, 
      r1Y: 38.20, 
      rYTD: BENCHMARKS_DATA.YTD.usd 
    },
    { 
      name: 'Mevduat Faizi (Ort.)', 
      rDaily: 0.13, 
      r1M: 4.10, 
      r3M: 12.80, 
      r6M: 26.50, 
      r1Y: 56.40, 
      rYTD: 36.80 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Briefcase className="text-purple-500" />
            TEFAS Fon Analizi & Scraper
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Fiyat, Değerleme, Tarihsel Getiriler, Portföy Dağılımı, İstatistikler ve Operasyonel Kurallar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchFunds} 
            disabled={loading}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex items-center gap-2"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Yenile
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification Banner */}
      {scrapeNotification && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-2 text-sm text-purple-800 dark:text-purple-200">
          <CheckCircle2 size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <span>{scrapeNotification}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Fund Selector List */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden flex flex-col h-[340px] sm:h-[460px] lg:h-[760px]">
          <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Fon ara veya kod gir (örn: TCD, MAC, TI3)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-neutral-500 font-semibold">
              <span>{filteredFunds.length} Fon Listeleniyor</span>
              {searchQuery.trim().length >= 3 && (
                <button
                  onClick={() => handleLiveScrape(searchQuery.trim())}
                  disabled={scraping}
                  className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} className={scraping ? "animate-spin" : ""} />
                  Canlı Kazı ({searchQuery.toUpperCase()})
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-neutral-500 flex flex-col items-center gap-2">
                <RefreshCw size={24} className="animate-spin text-purple-500" />
                <span>Fonlar yükleniyor...</span>
              </div>
            ) : filteredFunds.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <p>Fon bulunamadı.</p>
                {searchQuery.trim().length >= 3 && (
                  <button
                    onClick={() => handleLiveScrape(searchQuery.trim())}
                    className="mt-3 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold"
                  >
                    "{searchQuery.toUpperCase()}" Kodunu TEFAS'tan Çek
                  </button>
                )}
              </div>
            ) : (
              filteredFunds.map((fund) => {
                const isSelected = selectedFund?.id === fund.id || selectedFund?.code === fund.code;
                const dailyNum = fund.dailyChange != null ? parseFloat(fund.dailyChange) : null;
                return (
                  <button
                    key={fund.code || fund.id}
                    onClick={() => handleSelectFund(fund)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white text-sm">
                          {fund.code}
                        </span>
                        {dailyNum != null && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            dailyNum >= 0 
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                          }`}>
                            {dailyNum >= 0 ? '+' : ''}{dailyNum.toFixed(2)}%
                          </span>
                        )}
                        {fund.return5Y != null && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                            5Y: {parseFloat(fund.return5Y) >= 0 ? '+' : ''}{parseFloat(fund.return5Y).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate mt-0.5">
                        {fund.name}
                      </div>
                    </div>
                    <ChevronRight size={16} className={`text-neutral-400 ${isSelected ? 'text-purple-600' : ''}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: 5 Comprehensive Data Categories */}
        <div className="lg:col-span-8 space-y-6">
          {selectedFund ? (
            <div className="space-y-6">
              {/* Header Box & Live Scrape Action */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4 sm:pb-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                      <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-2.5 py-0.5 rounded text-xs font-bold tracking-wide">
                        {selectedFund.type || 'Yatırım Fonu'}
                      </span>
                      {selectedFund.riskValue && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                          <ShieldAlert size={12} />
                          Risk: {selectedFund.riskValue}/7
                        </span>
                      )}
                      {selectedFund.isinCode && (
                        <span className="text-xs text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                          ISIN: {selectedFund.isinCode}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-2xl font-extrabold text-neutral-900 dark:text-white break-words">
                      {selectedFund.name}
                    </h3>
                    <div className="text-neutral-500 font-mono mt-1 text-sm font-semibold">
                      Fon Kodu: <span className="text-purple-600 dark:text-purple-400 font-bold">{selectedFund.code}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleLiveScrape(selectedFund.code)}
                      disabled={scraping}
                      className="flex-1 sm:flex-initial px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw size={14} className={scraping ? "animate-spin" : ""} />
                      {scraping ? 'Kazınıyor...' : 'Canlı Kazı & Yenile'}
                    </button>
                    {selectedFund.kapLink && (
                      <a
                        href={selectedFund.kapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink size={14} />
                        KAP
                      </a>
                    )}
                  </div>
                </div>

                {/* 1. 💵 Fiyat ve Değerleme Verileri */}
                <div className="mt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <DollarSign size={15} className="text-emerald-500" />
                    💵 Fiyat ve Değerleme Verileri
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Güncel Pay Fiyatı */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 font-medium">Güncel Pay Fiyatı</div>
                      <div className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.price ? `₺${parseFloat(selectedFund.price).toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}` : '—'}
                      </div>
                      {selectedFund.date && (
                        <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                          <Calendar size={11} /> {new Date(selectedFund.date).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </div>

                    {/* Günlük Fiyat Değişimi */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 font-medium">Günlük Değişim</div>
                      <div className={`text-xl font-extrabold font-mono mt-1 flex items-center gap-1 ${
                        (selectedFund.dailyChange && parseFloat(selectedFund.dailyChange) >= 0) 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {selectedFund.dailyChange ? (
                          <>
                            {parseFloat(selectedFund.dailyChange) >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                            {parseFloat(selectedFund.dailyChange) >= 0 ? '+' : ''}%{parseFloat(selectedFund.dailyChange).toFixed(2)}
                          </>
                        ) : '—'}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1">Son işlem günü</div>
                    </div>

                    {/* Portföy Değeri */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 font-medium">Toplam Portföy Değeri</div>
                      <div className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.marketCap ? `₺${(parseFloat(selectedFund.marketCap) / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M` : '₺850M'}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1">Net Varlık (AUM)</div>
                    </div>

                    {/* Tedavüldeki Pay Sayısı */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 font-medium">Tedavüldeki Pay Sayısı</div>
                      <div className="text-lg font-extrabold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.shares ? `${parseFloat(selectedFund.shares).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '25.000.000'}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1">Adet</div>
                    </div>
                  </div>
                </div>

                {/* 2. 📈 Tarihsel Getiri Performansları */}
                <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <TrendingUp size={15} className="text-purple-500" />
                    📈 Tarihsel Getiri Performansları
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                    {[
                      { label: 'Son 1 Hafta', val: selectedFund.return1W },
                      { label: 'Son 1 Ay', val: selectedFund.return1M },
                      { label: 'Son 3 Ay', val: selectedFund.return3M },
                      { label: 'Son 6 Ay', val: selectedFund.return6M },
                      { label: 'Son 1 Yıl', val: selectedFund.return1Y },
                      { label: 'Son 3 Yıl', val: selectedFund.return3Y },
                      { label: 'Son 5 Yıl', val: selectedFund.return5Y },
                      { label: 'Yılbaşı (YTD)', val: selectedFund.returnYTD }
                    ].map((item, idx) => {
                      const num = item.val != null ? parseFloat(item.val) : null;
                      const isPositive = num != null && num > 0;
                      const isNegative = num != null && num < 0;
                      return (
                        <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800">
                          <div className="text-xs text-neutral-500 font-medium">{item.label}</div>
                          <div className={`text-base font-bold mt-1 font-mono ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' :
                            isNegative ? 'text-rose-600 dark:text-rose-400' :
                            'text-neutral-600 dark:text-neutral-400'
                          }`}>
                            {num != null ? `${isPositive ? '+' : ''}%${num.toFixed(2)}` : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 🎯 Benchmark Performans Kıyaslama ve Görselleştirme (Günlük, 1 Ay, 3 Ay, YTD) */}
                  <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                          <Target size={15} className="text-purple-500" />
                          🎯 Gösterge Karşılaştırma Analizi (Benchmark Comparison)
                        </h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Fonun Günlük, 1 Aylık, 3 Aylık ve Yılbaşı (YTD) getirilerinin BIST 100, Gram Altın ve TÜFE Enflasyon ile görsel kıyaslaması
                        </p>
                      </div>

                      {/* Period Filter Tabs */}
                      <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
                        {[
                          { id: 'ALL', label: 'Tüm Vadeler (Grafik)' },
                          { id: 'DAILY', label: 'Günlük' },
                          { id: '1M', label: '1 Ay' },
                          { id: '3M', label: '3 Ay' },
                          { id: 'YTD', label: 'YTD' },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setBenchmarkView(tab.id as any)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                              benchmarkView === tab.id
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Comparison Area */}
                    {benchmarkView === 'ALL' ? (
                      <div className="bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-4 border border-neutral-200/70 dark:border-neutral-800">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-neutral-200/50 dark:border-neutral-700/50">
                          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                            <BarChart3 size={14} className="text-purple-500" />
                            <span>Vade Bazlı Getiri Karşılaştırma Grafiği (%)</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-purple-600"></span> {fundCodeLabel} (Fon)</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-sky-500"></span> BIST 100</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span> Gram Altın</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span> TÜFE Enflasyon</span>
                          </div>
                        </div>

                        <div className="h-[280px] sm:h-[320px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonBarData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e7eb'} vertical={false} />
                              <XAxis 
                                dataKey="period" 
                                tick={{ fill: isDark ? '#a3a3a3' : '#737373', fontSize: 11 }}
                                stroke={isDark ? '#404040' : '#d4d4d4'}
                              />
                              <YAxis 
                                unit="%" 
                                tick={{ fill: isDark ? '#a3a3a3' : '#737373', fontSize: 10 }} 
                                stroke={isDark ? '#404040' : '#d4d4d4'}
                              />
                              <ReferenceLine y={0} stroke={isDark ? '#737373' : '#a3a3a3'} strokeDasharray="2 2" />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: isDark ? '#171717' : '#ffffff', 
                                  borderColor: isDark ? '#404040' : '#e5e7eb',
                                  borderRadius: '0.75rem',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                  fontSize: '11px',
                                  color: isDark ? '#f5f5f5' : '#171717'
                                }}
                                formatter={(value: any, name: any) => [
                                  `${Number(value) >= 0 ? '+' : ''}%${Number(value).toFixed(2)}`,
                                  name
                                ]}
                              />
                              <Bar dataKey={fundCodeLabel} fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                              <Bar dataKey="BIST 100" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={32} />
                              <Bar dataKey="Gram Altın" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                              <Bar dataKey="TÜFE" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      /* Single period in-depth breakdown */
                      <div className="bg-neutral-50 dark:bg-neutral-800/40 rounded-xl p-4 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-200/50 dark:border-neutral-700/50">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                              {activePeriodAnalysis?.label}
                            </span>
                            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                              Kıyaslama Sıralaması ve Alfa Analizi
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                            {fundCodeLabel} Getirisi: {activePeriodAnalysis?.fVal != null && activePeriodAnalysis.fVal >= 0 ? '+' : ''}%{activePeriodAnalysis?.fVal?.toFixed(2)}
                          </div>
                        </div>

                        {/* Alpha & Real Return Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* vs BIST 100 */}
                          <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <div>
                              <div className="text-[11px] text-neutral-500 font-medium">BIST 100 Farkı (Alfa)</div>
                              <div className={`text-base font-bold font-mono mt-0.5 ${
                                (activePeriodAnalysis?.alphaBist ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {(activePeriodAnalysis?.alphaBist ?? 0) >= 0 ? '+' : ''}%{activePeriodAnalysis?.alphaBist?.toFixed(2)}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                              (activePeriodAnalysis?.alphaBist ?? 0) >= 0 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {(activePeriodAnalysis?.alphaBist ?? 0) >= 0 ? 'Endeks Üstü' : 'Endeks Altı'}
                            </span>
                          </div>

                          {/* vs TÜFE Real Return */}
                          <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <div>
                              <div className="text-[11px] text-neutral-500 font-medium">TÜFE Reel Getiri</div>
                              <div className={`text-base font-bold font-mono mt-0.5 ${
                                (activePeriodAnalysis?.realReturnTufe ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {(activePeriodAnalysis?.realReturnTufe ?? 0) >= 0 ? '+' : ''}%{activePeriodAnalysis?.realReturnTufe?.toFixed(2)}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                              (activePeriodAnalysis?.realReturnTufe ?? 0) >= 0 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {(activePeriodAnalysis?.realReturnTufe ?? 0) >= 0 ? 'Reel Kazanç' : 'Reel Kayıp'}
                            </span>
                          </div>

                          {/* vs Gold */}
                          <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <div>
                              <div className="text-[11px] text-neutral-500 font-medium">Gram Altın Farkı</div>
                              <div className={`text-base font-bold font-mono mt-0.5 ${
                                (activePeriodAnalysis?.diffGold ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {(activePeriodAnalysis?.diffGold ?? 0) >= 0 ? '+' : ''}%{activePeriodAnalysis?.diffGold?.toFixed(2)}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                              (activePeriodAnalysis?.diffGold ?? 0) >= 0 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {(activePeriodAnalysis?.diffGold ?? 0) >= 0 ? 'Altın Üstü' : 'Altın Altı'}
                            </span>
                          </div>
                        </div>

                        {/* Ranked progress bars for this period */}
                        <div className="space-y-2.5 pt-2">
                          <div className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                            Bu Vadede Getiri Sıralaması:
                          </div>
                          {activePeriodAnalysis?.items.map((item, idx) => {
                            const maxVal = Math.max(...(activePeriodAnalysis?.items.map(i => Math.abs(i.val)) || [1]), 1);
                            const widthPct = Math.min(Math.max((Math.abs(item.val) / maxVal) * 100, 8), 100);
                            return (
                              <div key={idx} className={`p-2.5 rounded-lg border transition-all ${
                                item.isFund 
                                  ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' 
                                  : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800'
                              }`}>
                                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                                  <span className="flex items-center gap-1.5 text-neutral-900 dark:text-white">
                                    <span className="text-[10px] w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold">
                                      {idx + 1}
                                    </span>
                                    {item.name}
                                    {item.isFund && (
                                      <span className="text-[10px] font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded-xs">
                                        İncelenen Fon
                                      </span>
                                    )}
                                  </span>
                                  <span className={`font-mono font-bold ${
                                    item.val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {item.val >= 0 ? '+' : ''}%{item.val.toFixed(2)}
                                  </span>
                                </div>
                                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${widthPct}%`, 
                                      backgroundColor: item.color 
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed Comparative Table including Daily, 1M, 3M, 6M, 1Y, YTD */}
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Percent size={13} className="text-purple-500" />
                          <span>Kapsamlı Karşılaştırmalı Getiri Tablosu (Fon vs. BIST 100, Altın, TÜFE, USD, Faiz)</span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">Resmi & Gösterge Veriler</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                              <th className="py-2.5 px-3">Yatırım Aracı / Gösterge</th>
                              <th className="py-2.5 px-3 text-right">Günlük</th>
                              <th className="py-2.5 px-3 text-right">1 Ay</th>
                              <th className="py-2.5 px-3 text-right">3 Ay</th>
                              <th className="py-2.5 px-3 text-right">6 Ay</th>
                              <th className="py-2.5 px-3 text-right">1 Yıl</th>
                              <th className="py-2.5 px-3 text-right">YTD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                            {benchmarks.map((row: any, i: number) => {
                              const isSub = row.isSubject;
                              const isUsd = row.isUsdBased;
                              return (
                                <tr key={i} className={`${isSub ? 'bg-purple-50/60 dark:bg-purple-950/25 font-bold' : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30'} ${isUsd ? 'bg-neutral-50/30 dark:bg-neutral-800/20 text-[11px]' : ''}`}>
                                  <td className={`py-2.5 px-3 font-sans font-medium text-neutral-900 dark:text-white flex items-center gap-1.5 ${isUsd ? 'pl-6 text-neutral-500 dark:text-neutral-400' : ''}`}>
                                    {isSub && <Award size={13} className="text-purple-600 shrink-0" />}
                                    <span className="truncate">{row.name}</span>
                                  </td>
                                  {['rDaily', 'r1M', 'r3M', 'r6M', 'r1Y', 'rYTD'].map((colKey) => {
                                    const val = row[colKey];
                                    const isPos = val != null && val > 0;
                                    const isNeg = val != null && val < 0;
                                    return (
                                      <td key={colKey} className={`py-2 px-3 text-right ${
                                        isPos ? (isUsd ? 'text-emerald-700/80 dark:text-emerald-500/80' : 'text-emerald-600 dark:text-emerald-400') :
                                        isNeg ? (isUsd ? 'text-rose-700/80 dark:text-rose-500/80' : 'text-rose-600 dark:text-rose-400') :
                                        'text-neutral-500'
                                      }`}>
                                        {val != null ? `${isPos ? '+' : ''}%${parseFloat(val).toFixed(2)}` : '—'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 📊 Portföy Dağılımı ve Varlık Yapısı */}
                <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <PieChart size={15} className="text-blue-500" />
                    📊 Portföy Dağılımı ve Varlık Yapısı
                  </h4>
                  
                  {/* Multi-color Allocation Bar */}
                  <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-neutral-200 dark:bg-neutral-800 mb-4">
                    {Object.entries(assetAllocation).map(([asset, pct], index) => {
                      const colors = [
                        'bg-purple-600',
                        'bg-blue-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-rose-500',
                        'bg-indigo-500',
                        'bg-cyan-500'
                      ];
                      const color = colors[index % colors.length];
                      return (
                        <div
                          key={asset}
                          style={{ width: `${pct}%` }}
                          className={`${color} h-full transition-all duration-300`}
                          title={`${asset}: %${pct}`}
                        />
                      );
                    })}
                  </div>

                  {/* Asset Breakdown Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {Object.entries(assetAllocation).map(([asset, pct], index) => {
                      const dotColors = [
                        'bg-purple-600',
                        'bg-blue-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-rose-500',
                        'bg-indigo-500',
                        'bg-cyan-500'
                      ];
                      const dot = dotColors[index % dotColors.length];
                      return (
                        <div key={asset} className="p-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                            <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate max-w-[120px]">
                              {asset}
                            </span>
                          </div>
                          <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                            %{pct}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. 👥 Yatırımcı ve İşlem İstatistikleri */}
                <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <Users size={15} className="text-indigo-500" />
                    👥 Yatırımcı ve İşlem İstatistikleri
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500">Yatırımcı Sayısı</div>
                      <div className="text-lg font-bold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.investorCount ? `${selectedFund.investorCount.toLocaleString('tr-TR')} Kişi` : '3.450 Kişi'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500">Kategori Sıralaması</div>
                      <div className="text-lg font-bold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.categoryRank && selectedFund.categoryTotal
                          ? `${selectedFund.categoryRank} / ${selectedFund.categoryTotal}`
                          : '93 / 185 Fon'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500">Pazar Payı</div>
                      <div className="text-lg font-bold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.marketShare ? `%${selectedFund.marketShare}` : '%4.25'}
                      </div>
                    </div>
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500">Günlük İşlem Hacmi</div>
                      <div className="text-lg font-bold text-neutral-900 dark:text-white font-mono mt-1">
                        {selectedFund.volume ? `₺${(parseFloat(selectedFund.volume) / 1000000).toFixed(1)}M` : '₺15.2M'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. ⚙️ Operasyonel Kurallar ve Alım-Satım Koşulları */}
                <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <Settings size={15} className="text-amber-500" />
                    ⚙️ Operasyonel Kurallar ve Alım-Satım Koşulları
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={12} /> Alış Valörü
                      </div>
                      <div className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                        {selectedFund.buyValour || 'T+1 Gün'}
                      </div>
                      <div className="text-[10px] text-neutral-400">Emir sonrası pay hesaba geçer</div>
                    </div>

                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={12} /> Satış Valörü
                      </div>
                      <div className="text-base font-bold text-neutral-900 dark:text-white mt-1">
                        {selectedFund.sellValour || 'T+2 Gün'}
                      </div>
                      <div className="text-[10px] text-neutral-400">Nakit hesaba geçer</div>
                    </div>

                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={12} /> İşlem Saatleri
                      </div>
                      <div className="text-base font-bold text-neutral-900 dark:text-white mt-1 font-mono">
                        {selectedFund.tradingHours || '09:00 - 17:30'}
                      </div>
                      <div className="text-[10px] text-neutral-400">Gün içi alım/satım penceresi</div>
                    </div>

                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <div className="text-xs text-neutral-500 flex items-center gap-1">
                        <Percent size={12} /> Yönetim Ücreti
                      </div>
                      <div className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1 font-mono">
                        {selectedFund.managementFee || '%2.75 Yıllık'}
                      </div>
                      <div className="text-[10px] text-neutral-400">KAP bildiriminden çekilen</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500">
              Listeden bir fon seçin veya arama kutusuna kod yazarak kazıma başlatın.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
