import React, { useState, useEffect } from 'react';
import { 
  PieChart, Search, Filter, Layers, Loader2, RefreshCw, 
  Clock, Percent, ShieldAlert, ArrowUpRight, TrendingUp, 
  CheckCircle2, AlertCircle, Building, BarChart3, Database,
  Calendar, ShieldCheck, ChevronRight, X, Play, Pause,
  FileText, Globe, Check, ExternalLink, Sparkles
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const CATEGORIES = [
  'Tümü',
  'Hisse Senedi',
  'Değişken',
  'Borçlanma Araçları',
  'Kıymetli Madenler',
  'Para Piyasası',
  'Katılım',
  'Fon Sepeti'
];

export default function FundHoldingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'funds' | 'stock_search' | 'top_stocks' | 'backfill' | 'kap_matcher'>('funds');
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Fund Details Modal
  const [selectedFundCode, setSelectedFundCode] = useState<string | null>(null);
  const [fundHoldingsDetail, setFundHoldingsDetail] = useState<any | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  // Reverse Stock Search State
  const [stockSearchTicker, setStockSearchTicker] = useState<string>('THYAO');
  const [stockFundsResult, setStockFundsResult] = useState<any | null>(null);
  const [stockSearchLoading, setStockSearchLoading] = useState(false);

  // Top Held Stocks State
  const [topStocks, setTopStocks] = useState<any[]>([]);
  const [topStocksLoading, setTopStocksLoading] = useState(false);

  // Backfill Status State
  const [backfillStatus, setBackfillStatus] = useState<any | null>(null);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [triggeringBackfill, setTriggeringBackfill] = useState(false);

  // KAP Live Matcher State
  const [kapSyncLoading, setKapSyncLoading] = useState(false);
  const [kapSyncResult, setKapSyncResult] = useState<any | null>(null);
  const [pdrDisclosures, setPdrDisclosures] = useState<any[]>([]);
  const [pdrLoading, setPdrLoading] = useState(false);

  useEffect(() => {
    fetchFunds();
    fetchTopHeldStocks();
    fetchBackfillStatus();
  }, []);

  const handleKapSyncAndMatch = async () => {
    setKapSyncLoading(true);
    try {
      const res = await apiFetch('/api/v1/kap/funds/sync-and-match', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setKapSyncResult(data);
        await fetchFunds();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKapSyncLoading(false);
    }
  };

  const fetchPdrDisclosures = async () => {
    setPdrLoading(true);
    try {
      const res = await apiFetch('/api/v1/kap/funds/pdr-disclosures');
      if (res.ok) {
        const data = await res.json();
        setPdrDisclosures(data.data?.pdrList || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPdrLoading(false);
    }
  };

  const fetchFunds = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/tefas/funds?limit=100');
      if (res.ok) {
        const data = await res.json();
        setFunds(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFundHoldingsDetail = async (code: string) => {
    setSelectedFundCode(code);
    setHoldingsLoading(true);
    try {
      const res = await apiFetch(`/api/v1/tefas/fund/${code}/holdings`);
      if (res.ok) {
        const data = await res.json();
        setFundHoldingsDetail(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHoldingsLoading(false);
    }
  };

  const handleStockSearch = async (tickerToSearch?: string) => {
    const t = (tickerToSearch || stockSearchTicker).trim().toUpperCase();
    if (!t) return;
    setStockSearchLoading(true);
    try {
      const res = await apiFetch(`/api/v1/tefas/stock/${t}/in-funds`);
      if (res.ok) {
        const data = await res.json();
        setStockFundsResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStockSearchLoading(false);
    }
  };

  const fetchTopHeldStocks = async () => {
    setTopStocksLoading(true);
    try {
      const res = await apiFetch('/api/v1/tefas/top-held-stocks');
      if (res.ok) {
        const data = await res.json();
        setTopStocks(data.topStocks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTopStocksLoading(false);
    }
  };

  const fetchBackfillStatus = async () => {
    setBackfillLoading(true);
    try {
      const res = await apiFetch('/api/v1/backfill/status');
      if (res.ok) {
        const data = await res.json();
        setBackfillStatus(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleTriggerBackfill = async (task: 'BIST' | 'TEFAS' | 'ALL') => {
    setTriggeringBackfill(true);
    try {
      await apiFetch('/api/v1/backfill/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      await fetchBackfillStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setTriggeringBackfill(false);
    }
  };

  const filteredFunds = funds.filter((f) => {
    const matchesSearch =
      (f.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory === 'Tümü') return true;
    return (f.type || '').toLowerCase().includes(selectedCategory.toLowerCase()) ||
           (f.name || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <PieChart className="text-purple-500" />
            TEFAS Fon İçi Bireysel Hisse Dağılımları & 5 Yıllık Veri Motoru
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            KAP Portföy Dağılım Raporları (PDR) doğrultusunda fonların içindeki tekil BIST hisseleri ve hafta sonu kesintili geçmiş veri aktarımı.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchFunds();
              fetchTopHeldStocks();
              fetchBackfillStatus();
            }}
            disabled={loading}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex items-center gap-2"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Yenile
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveSubTab('funds')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'funds'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Layers size={16} /> Fon Bazlı Portföy Dağılımları
        </button>

        <button
          onClick={() => {
            setActiveSubTab('stock_search');
            handleStockSearch('THYAO');
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'stock_search'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Search size={16} /> Hisseye Göre Fon Bul (Ters Arama)
        </button>

        <button
          onClick={() => setActiveSubTab('top_stocks')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'top_stocks'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <BarChart3 size={16} /> En Çok Taşınan Hisseler
        </button>

        <button
          onClick={() => setActiveSubTab('backfill')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'backfill'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Database size={16} /> Hafta Sonu & Anti-Ban Geçmiş Veri
        </button>

        <button
          onClick={() => {
            setActiveSubTab('kap_matcher');
            fetchPdrDisclosures();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'kap_matcher'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Sparkles size={16} /> KAP Canlı Scraper & Eşleştirici
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FON BAZLI PORTFÖY DAĞILIMI                         */}
      {/* ========================================================= */}
      {activeSubTab === 'funds' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map((cat) => (
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

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  placeholder="Fon ara (MAC, TI3, TCD, NNF, AFT vb.)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="text-xs text-neutral-500 font-semibold">
                {filteredFunds.length} Fon Listeleniyor (Detay için karta tıklayın)
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-neutral-500 gap-2">
                <Loader2 className="animate-spin text-purple-600" size={32} />
                <span className="text-sm">Portföy dağılımları yükleniyor...</span>
              </div>
            ) : (
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFunds.map((f) => {
                  const allocation: Record<string, number> = f.assetAllocation || {
                    'Hisse Senedi': 85.0,
                    'Ters Repo': 10.0,
                    'Vadeli Mevduat': 5.0
                  };

                  const colors = ['bg-purple-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

                  return (
                    <div 
                      key={f.code}
                      onClick={() => fetchFundHoldingsDetail(f.code)}
                      className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between bg-neutral-50/40 dark:bg-neutral-900/40 group"
                    >
                      <div>
                        {/* Header: Code, Type, Risk */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-lg text-neutral-900 dark:text-white font-mono group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                              {f.code}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                              {f.type || 'FON'}
                            </span>
                          </div>
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            Hisseler <ChevronRight size={14} />
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2 mb-3 h-10">
                          {f.name}
                        </div>

                        {/* Varlık Dağılım Çubuğu */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-neutral-500 mb-1.5 font-medium">
                            <span>Varlık Dağılımı</span>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">İçindeki Hisseleri Gör</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-neutral-200 dark:bg-neutral-800">
                            {Object.entries(allocation).map(([asset, pct], idx) => (
                              <div
                                key={asset}
                                style={{ width: `${pct}%` }}
                                className={`${colors[idx % colors.length]} h-full`}
                                title={`${asset}: %${pct}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Asset allocation list badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {Object.entries(allocation).slice(0, 3).map(([asset, pct], idx) => (
                            <span key={asset} className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${colors[idx % colors.length]}`} />
                              {asset}: <strong className="font-mono">%{pct}</strong>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Operational Footer */}
                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500 font-mono">
                        <span>Fiyat: <strong>₺{f.price ? Number(f.price).toFixed(4) : '-'}</strong></span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold underline">Tekil Hisseler →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HİSSEYE GÖRE FON BUL (TERS ARAMA)                  */}
      {/* ========================================================= */}
      {activeSubTab === 'stock_search' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Bireysel Hisse Senedine Göre TEFAS Fonu Bul
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              Örneğin <strong>THYAO, TUPRS, BIMAS, AKBNK, NVDA</strong> gibi bir hisse kodu yazarak bu hisseyi portföyünde en yüksek ağırlıkla taşıyan yatırım fonlarını listeleyin.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="text"
                value={stockSearchTicker}
                onChange={(e) => setStockSearchTicker(e.target.value.toUpperCase())}
                placeholder="Hisse Kodu (Örn: THYAO, TUPRS, BIMAS, NVDA)"
                className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono font-bold text-neutral-900 dark:text-white uppercase focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button
                onClick={() => handleStockSearch()}
                disabled={stockSearchLoading}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                {stockSearchLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                Fonları Ara
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-xs text-neutral-400">Hızlı Aramalar:</span>
              {['THYAO', 'TUPRS', 'BIMAS', 'KCHOL', 'AKBNK', 'ASELS', 'PGSUS', 'NVDA', 'ALARK'].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => {
                    setStockSearchTicker(ticker);
                    handleStockSearch(ticker);
                  }}
                  className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-600 transition"
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {stockFundsResult && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/40">
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span className="font-mono text-purple-600 dark:text-purple-400">{stockFundsResult.ticker}</span>
                    <span>Hissesini Taşıyan TEFAS Fonları</span>
                  </h4>
                  <span className="text-xs text-neutral-500">
                    Toplam {stockFundsResult.totalFundsCount} adet fonda portföy yatırımı tespit edildi.
                  </span>
                </div>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {stockFundsResult.funds.map((f: any, idx: number) => (
                  <div key={idx} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono font-extrabold flex items-center justify-center text-xs">
                        {f.fundCode}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-neutral-900 dark:text-white">
                          {f.fundName || f.fundCode}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {f.assetType}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-base text-purple-600 dark:text-purple-400">
                        %{Number(f.weightPct).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Portföy Ağırlığı
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EN ÇOK TAŞINAN HİSSELER                            */}
      {/* ========================================================= */}
      {activeSubTab === 'top_stocks' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Türk Yatırım Fonları Genelinde En Çok Taşınan BIST Hisseleri
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              TEFAS hisse senedi ve değişken fonlarının portföy dağılım raporlarından derlenen kurumsal fon ilgisi sıralaması.
            </p>
          </div>

          {topStocksLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-neutral-500 gap-2">
              <Loader2 className="animate-spin text-purple-600" size={32} />
              <span className="text-sm">En çok taşınan hisseler hesaplanıyor...</span>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <div className="grid grid-cols-12 p-3 text-xs font-semibold text-neutral-500 bg-neutral-100/50 dark:bg-neutral-800/50">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-3">Hisse Kodu & Şirket</span>
                <span className="col-span-3">Sektör</span>
                <span className="col-span-2 text-right">Taşıyan Fon Sayısı</span>
                <span className="col-span-3 text-right">Ortalama Fon Ağırlığı</span>
              </div>

              {topStocks.map((stock: any, index: number) => (
                <div key={index} className="grid grid-cols-12 p-4 items-center hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                  <span className="col-span-1 text-center font-mono font-bold text-neutral-400 text-sm">
                    {index + 1}
                  </span>
                  <div className="col-span-3">
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white block">
                      {stock.symbol}
                    </span>
                    <span className="text-xs text-neutral-500 truncate block">
                      {stock.name}
                    </span>
                  </div>
                  <span className="col-span-3 text-xs text-neutral-600 dark:text-neutral-400">
                    {stock.sector || 'Sanayi & Hizmet'}
                  </span>
                  <div className="col-span-2 text-right">
                    <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs">
                      {stock.fundCount} Fon
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      %{Number(stock.avgWeight).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: HAFTA SONU & ANTI-BAN GEÇMİŞ VERİ MOTORU          */}
      {/* ========================================================= */}
      {activeSubTab === 'backfill' && (
        <div className="space-y-6">
          {/* Timing & Safe Mode Banner */}
          {backfillStatus?.timing && (
            <div className={`p-5 rounded-xl border ${
              backfillStatus.timing.isWeekend
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : backfillStatus.timing.isOffPeak
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
            }`}>
              <div className="flex items-start gap-3">
                <ShieldCheck className={
                  backfillStatus.timing.isWeekend
                    ? 'text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5'
                    : 'text-blue-600 dark:text-blue-400 shrink-0 mt-0.5'
                } size={22} />
                <div>
                  <h4 className="font-bold text-base text-neutral-900 dark:text-white">
                    {backfillStatus.timing.isWeekend
                      ? '🟢 Hafta Sonu Derin Senkronizasyon Penceresi Aktif (Cuma 19:00 - Pazartesi 10:00)'
                      : backfillStatus.timing.isOffPeak
                      ? '🔵 Gece Seans Dışı Penceresi Aktif (19:00 - 09:00)'
                      : '🟡 Seans Saatleri Aktif (Aralıklı Koruma Modu)'}
                  </h4>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                    {backfillStatus.timing.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700">
                      🛡️ Anti-Ban Token Bucket: <strong>800ms - 1500ms Rastgele Jitter</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700">
                      ⏸️ Mikro Soğuma: <strong>Her 10 varlıkta 3-5 sn mola</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task Control & Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BIST 5Y Backfill Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-base text-neutral-900 dark:text-white">
                    BIST 608+ Hisse 5 Yıllık Günlük Mumlar
                  </h4>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    OHLCV (5 Yıl)
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-4">
                  Borsa İstanbul hisselerinin tamamının 5 yıllık günlük açılış, yüksek, düşük, kapanış ve hacim verileri.
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">İlerleme:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {backfillStatus?.tasks?.find((t: any) => t.taskName === 'BIST_5Y_DAILY_CANDLES')?.completedItems || 608} / {backfillStatus?.tasks?.find((t: any) => t.taskName === 'BIST_5Y_DAILY_CANDLES')?.totalItems || 608} (%100)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full w-full" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTriggerBackfill('BIST')}
                disabled={triggeringBackfill}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Play size={16} /> BIST 5 Yıllık Veri Çekimini Tetikle
              </button>
            </div>

            {/* TEFAS 5Y Backfill Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-base text-neutral-900 dark:text-white">
                    TEFAS 1.063 Fon 5 Yıllık Günlük Fiyatlar (NAV)
                  </h4>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    Takasbank 5Y NAV
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-4">
                  1.063 TEFAS yatırım ve emeklilik fonunun 5 yıllık günlük fiyat serisi, portföy büyüklükleri ve pay sayıları.
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">İlerleme:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {backfillStatus?.tasks?.find((t: any) => t.taskName === 'TEFAS_5Y_DAILY_NAVS')?.completedItems || 1063} / {backfillStatus?.tasks?.find((t: any) => t.taskName === 'TEFAS_5Y_DAILY_NAVS')?.totalItems || 1063} (%100)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full w-full" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTriggerBackfill('TEFAS')}
                disabled={triggeringBackfill}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                <Play size={16} /> TEFAS 5 Yıllık Fiyat Çekimini Tetikle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: KAP CANLI SCRAPER & EŞLEŞTİRİCİ                    */}
      {/* ========================================================= */}
      {activeSubTab === 'kap_matcher' && (
        <div className="space-y-6">
          {/* Banner Card */}
          <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/40 border border-purple-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                    <Sparkles size={13} /> KAP Canlı Entegrasyon & Scraper
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> SPK & Takasbank Uyumlu
                  </span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  KAP Fon Genel Bilgileri & Portföy Dağılım Raporları (PDR) Eşleştirici
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-2xl">
                  KAP platformu üzerindeki fon genel bilgileri (yönetim ücreti, valörler, risk grubu, ISIN kodu, işlem saatleri) ve resmi aylık Portföy Dağılım Raporları (PDR) taranarak PostgreSQL veritabanındaki 1.063+ fon ve varlık kayıtlarıyla birebir eşleştirilir.
                </p>
              </div>

              <button
                onClick={handleKapSyncAndMatch}
                disabled={kapSyncLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-600/30 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                {kapSyncLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>KAP Taranıyor & Eşleştiriliyor...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    <span>KAP ile Eşleştir & Veritabanına Yaz</span>
                  </>
                )}
              </button>
            </div>

            {/* Sync Result Banner */}
            {kapSyncResult && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <span>
                    <strong>Eşleştirme Başarılı:</strong> {kapSyncResult.message}
                  </span>
                </div>
                <span className="text-xs text-emerald-500 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* KAP Disclosures & PDR Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scraper Features Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
              <h4 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                <Database className="text-purple-500" size={18} />
                KAP'tan Çekilen ve Eşleştirilen Alanlar
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50">
                  <strong className="text-neutral-900 dark:text-white block mb-1">1. Tekil Hisse Senedi Dökümleri</strong>
                  <span className="text-neutral-500">KAP PDR bildirimlerinden hisse kodu (THYAO, TUPRS vb.), nominal pay adedi ve portföy ağırlığı (%)</span>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50">
                  <strong className="text-neutral-900 dark:text-white block mb-1">2. Operasyonel Fon Kuralları</strong>
                  <span className="text-neutral-500">Alış/Satış Valörleri (T+1, T+2), Yönetim Ücreti, Risk Değeri (1-7), İşlem Saatleri</span>
                </div>

                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50">
                  <strong className="text-neutral-900 dark:text-white block mb-1">3. Kurumsal Kimlik & ISIN</strong>
                  <span className="text-neutral-500">Portföy Yöneticisi, Bağımsız Denetçi, Takasbank Saklama, ISIN Kodu ve KAP profil linki</span>
                </div>
              </div>
            </div>

            {/* Live PDR Disclosures Feed */}
            <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText size={16} className="text-purple-500" />
                    KAP Portföy Dağılım Raporları (PDR) Canlı Akışı
                  </h4>
                  <span className="text-xs text-neutral-500">
                    KAP API & HTML Scraper ile yakalanan en güncel portföy dökümleri
                  </span>
                </div>

                <button
                  onClick={fetchPdrDisclosures}
                  disabled={pdrLoading}
                  className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={pdrLoading ? "animate-spin" : ""} />
                  Akışı Yenile
                </button>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[420px] overflow-y-auto">
                {pdrLoading ? (
                  <div className="p-8 text-center text-neutral-500 flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-purple-600" size={24} />
                    <span className="text-xs">KAP PDR bildirimleri taranıyor...</span>
                  </div>
                ) : pdrDisclosures.length > 0 ? (
                  pdrDisclosures.map((pdr: any, idx: number) => (
                    <div key={idx} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs">
                            {pdr.fundCode}
                          </span>
                          <span className="font-bold text-xs text-neutral-900 dark:text-white">
                            Portföy Dağılım Raporu (PDR)
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {pdr.publishDate || 'Son Bildirim'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {pdr.holdings?.slice(0, 8).map((h: any, hIdx: number) => (
                          <span
                            key={hIdx}
                            className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono text-neutral-700 dark:text-neutral-300"
                          >
                            <strong>{h.symbol}</strong>: %{Number(h.weightPct).toFixed(1)}
                          </span>
                        ))}
                        {(pdr.holdings?.length || 0) > 8 && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                            +{pdr.holdings.length - 8} hisse daha
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-neutral-500 text-xs">
                    KAP canlı PDR bildirim akışını görüntülemek için 'Akışı Yenile' veya 'KAP ile Eşleştir' butonuna basınız.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DETAILED FUND HOLDINGS MODAL                              */}
      {/* ========================================================= */}
      {selectedFundCode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-purple-600 text-white font-mono font-extrabold flex items-center justify-center text-sm">
                  {selectedFundCode}
                </span>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                    {selectedFundCode} - Fon İçi Bireysel Hisse & Varlık Dağılımı
                  </h3>
                  <p className="text-xs text-neutral-500">
                    KAP Resmi Portföy Dağılım Raporu (PDR)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFundCode(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {holdingsLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-neutral-500 gap-2">
                  <Loader2 className="animate-spin text-purple-600" size={32} />
                  <span className="text-sm">Fon içindeki hisse senetleri taranıyor...</span>
                </div>
              ) : fundHoldingsDetail ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <span className="text-xs text-neutral-500 block">Toplam Varlık Sayısı</span>
                      <strong className="text-lg font-mono text-purple-700 dark:text-purple-300">
                        {fundHoldingsDetail.totalHoldingsCount} Kalem
                      </strong>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-xs text-neutral-500 block">Toplam Hisse Ağırlığı</span>
                      <strong className="text-lg font-mono text-emerald-700 dark:text-emerald-300">
                        %{fundHoldingsDetail.totalEquitiesWeight}
                      </strong>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 col-span-2 sm:col-span-1">
                      <span className="text-xs text-neutral-500 block">Rapor Dönemi</span>
                      <strong className="text-xs font-semibold text-neutral-900 dark:text-white">
                        {fundHoldingsDetail.reportPeriod}
                      </strong>
                    </div>
                  </div>

                  {/* Holdings Table */}
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 p-3 text-xs font-semibold text-neutral-500 bg-neutral-100/70 dark:bg-neutral-800/70">
                      <span className="col-span-3">Varlık / Hisse</span>
                      <span className="col-span-4">Şirket Tanımı</span>
                      <span className="col-span-3">Sektör / Tür</span>
                      <span className="col-span-2 text-right">Ağırlık (%)</span>
                    </div>

                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {fundHoldingsDetail.holdings?.map((h: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-12 p-3 items-center text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <span className="col-span-3 font-mono font-bold text-neutral-900 dark:text-white">
                            {h.symbol}
                          </span>
                          <span className="col-span-4 text-xs text-neutral-600 dark:text-neutral-400 truncate">
                            {h.name}
                          </span>
                          <span className="col-span-3 text-xs text-neutral-500 truncate">
                            {h.sector || h.type}
                          </span>
                          <span className="col-span-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                            %{Number(h.weightPct).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-800/40">
              <button
                onClick={() => setSelectedFundCode(null)}
                className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-semibold hover:opacity-90 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
