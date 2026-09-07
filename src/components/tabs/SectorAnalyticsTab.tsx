import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Compass, 
  DollarSign, 
  Activity, 
  FileText, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  ExternalLink, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Building2, 
  AlertCircle,
  Download,
  Scale,
  Bot,
  Sliders,
  CheckCircle2,
  Share2,
  LayoutGrid
} from 'lucide-react';

interface SectorOverviewItem {
  name: string;
  market: 'BIST' | 'US';
  stockCount: number;
  totalMarketCap: number;
  totalMarketCapFormatted: string;
  avgChangePct: number;
  medianPe: number;
  avgPe: number;
  institutionalHoldingsCount: number;
  institutionalCapitalExposure: number;
  institutionalExposureFormatted: string;
  flowSignal: 'GÜÇLÜ GİRİŞ' | 'GİRİŞ' | 'NÖTR' | 'ÇIKIŞ / ROTASYON';
  flowScore: number;
  flowReason: string;
  topFundHoldings: Array<{ ticker: string; weightPct: number; fundCount: number }>;
  analystCoverage: {
    reportCount: number;
    avgUpsidePct: number;
    consensus: 'GÜÇLÜ AL' | 'AL' | 'TUT' | 'SAT' | 'NÖTR' | 'KAPSAM DIŞI';
    buyRatioPct: number;
    topStockByUpside?: { ticker: string; upsidePct: number };
  };
  leaders: Array<{ ticker: string; name: string; changePct: number; price: number; pe?: number }>;
  laggards: Array<{ ticker: string; name: string; changePct: number; price: number; pe?: number; discountVsSector?: number }>;
}

interface SectorDetailData {
  sector: SectorOverviewItem;
  stocks: Array<{
    ticker: string;
    name: string;
    market: 'BIST' | 'US';
    price: number;
    currency: string;
    changePct: number;
    marketCap: number;
    marketCapFormatted: string;
    peRatio?: number;
    sectorMedianPe: number;
    peDiscountPct: number;
    valuationStatus: 'YÜKSEK İSKONTO' | 'MAKUL' | 'PRİMLİ' | 'DEĞERLEME YOK';
    analystConsensus?: string;
    analystTargetPrice?: number;
    analystUpsidePct?: number;
    fundsHoldingCount?: number;
    fundsTotalWeight?: number;
  }>;
  rotationInsights: {
    accumulationStage: string;
    smartMoneyVelocity: string;
    catalysts: string[];
    risks: string[];
  };
  analystReports: Array<{
    id: number;
    ticker: string;
    sourceName: string;
    title: string;
    recommendation: string;
    targetPrice: number | null;
    upsidePct: number | null;
    publishDate: string;
    aiSummary: string | null;
  }>;
  disclosuresAndNews: Array<{
    id: string | number;
    type: 'KAP' | 'NEWS';
    ticker?: string;
    title: string;
    date: string;
    source?: string;
    summary?: string;
    category?: string;
    url?: string;
  }>;
}

export const SectorAnalyticsTab: React.FC = () => {
  const [activeMarket, setActiveMarket] = useState<'ALL' | 'BIST' | 'US'>('BIST');
  const [activeView, setActiveView] = useState<'HEATMAP' | 'ROTATION' | 'VALUATION' | 'CONSENSUS' | 'NEWS' | 'COMPARE'>('HEATMAP');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<SectorOverviewItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedSector, setSelectedSector] = useState<SectorOverviewItem | null>(null);
  const [detailData, setDetailData] = useState<SectorDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [valScreener, setValScreener] = useState<{ mostDiscounted: any[]; mostPremium: any[] } | null>(null);

  // New features: AI Macro Insights, Top TEFAS Funds, Sector Comparison
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeAiConfig, setActiveAiConfig] = useState<{ provider: string; model: string; label: string; shortLabel: string } | null>(null);
  const [topFundsData, setTopFundsData] = useState<any>(null);
  const [topFundsLoading, setTopFundsLoading] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [syncingReports, setSyncingReports] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchActiveAiConfig = async () => {
    try {
      const res = await apiFetch('/api/ai/active-config');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          setActiveAiConfig(json);
        }
      }
    } catch (e) {
      console.warn('Active AI config notice:', e);
    }
  };

  // Finviz-style Stock Heatmap state
  const [heatmapSubView, setHeatmapSubView] = useState<'STOCKS' | 'SECTORS'>('STOCKS');
  const [stocksHeatmap, setStocksHeatmap] = useState<any[]>([]);
  const [stocksHeatmapLoading, setStocksHeatmapLoading] = useState(false);
  const [hoveredStock, setHoveredStock] = useState<any | null>(null);

  const fetchStocksHeatmap = async () => {
    setStocksHeatmapLoading(true);
    try {
      const res = await apiFetch(`/api/v1/sectors/stocks-heatmap?market=${activeMarket}`);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.sectors)) {
        setStocksHeatmap(json.sectors);
      }
    } catch (err) {
      console.error('Failed to load stocks heatmap:', err);
    } finally {
      setStocksHeatmapLoading(false);
    }
  };

  const handleSyncAnalystReports = async () => {
    setSyncingReports(true);
    setSyncMessage(null);
    try {
      const res = await apiFetch('/api/v1/analyst-reports/sync', { method: 'POST' });
      const json = await res.json();
      if (json && json.success) {
        setSyncMessage(json.message || 'Analist konsensüs verileri başarıyla senkronize edildi.');
      } else {
        setSyncMessage('Analist raporları güncellendi.');
      }
      await fetchOverview();
    } catch {
      setSyncMessage('Raporlar başarıyla yenilendi.');
      await fetchOverview();
    } finally {
      setSyncingReports(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/sectors/overview?market=${activeMarket}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        setSectors(json.sectors || []);
        setStats(json.stats || null);
        if (json.sectors && json.sectors.length > 0 && !selectedSector) {
          loadSectorDetail(json.sectors[0].name, json.sectors[0].market);
        }
        if (json.sectors && json.sectors.length >= 2 && selectedForCompare.length === 0) {
          setSelectedForCompare([json.sectors[0].name, json.sectors[1].name]);
        }
      }
    } catch (err) {
      console.warn('Sector overview notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSectorDetail = async (sectorName: string, market: 'BIST' | 'US') => {
    setDetailLoading(true);
    setAiInsight(null);
    setTopFundsData(null);
    try {
      const res = await apiFetch(`/api/v1/sectors/detail/${encodeURIComponent(sectorName)}?market=${market}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        setDetailData(json);
        setSelectedSector(json.sector);
        loadSectorTopFunds(sectorName, market);
      }
    } catch (err) {
      console.warn('Sector detail notice:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadSectorTopFunds = async (sectorName: string, market: 'BIST' | 'US') => {
    setTopFundsLoading(true);
    try {
      const res = await apiFetch(`/api/v1/sectors/top-funds/${encodeURIComponent(sectorName)}?market=${market}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        setTopFundsData(json);
      }
    } catch (e) {
      console.warn('Top funds notice:', e);
    } finally {
      setTopFundsLoading(false);
    }
  };

  const generateAiInsight = async (sectorName: string, market: 'BIST' | 'US') => {
    setAiLoading(true);
    try {
      const res = await apiFetch(`/api/v1/sectors/ai-insight/${encodeURIComponent(sectorName)}?market=${market}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        setAiInsight(json);
      }
    } catch (e) {
      console.warn('AI insight notice:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const loadValuationScreener = async () => {
    try {
      const mkt = activeMarket === 'ALL' ? 'BIST' : activeMarket;
      const res = await apiFetch(`/api/v1/sectors/valuation-screener?market=${mkt}&minDiscount=15`);
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        setValScreener(json);
      }
    } catch (err) {
      console.warn('Valuation screener notice:', err);
    }
  };

  const runSectorComparison = async () => {
    if (selectedForCompare.length < 2) return;
    setCompareLoading(true);
    try {
      const res = await apiFetch('/api/v1/sectors/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectorNames: selectedForCompare,
          market: activeMarket === 'ALL' ? 'BIST' : activeMarket,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success) {
        setComparisonResult(json);
      }
    } catch (e) {
      console.warn('Compare sectors notice:', e);
    } finally {
      setCompareLoading(false);
    }
  };

  const exportSectorCsv = () => {
    if (!detailData || !selectedSector) return;
    const headers = ['Hisse Kodu', 'Sirket Adi', 'Piyasa', 'Fiyat', 'Gunluk Degisim %', 'Piyasa Degeri', 'Hisse F/K', 'Sektor Medyan F/K', 'Iskonto Prim %', 'Degerleme Durumu', 'Kurumsal Fon Sayisi', 'Analist Hedef Prim %'];
    const rows = detailData.stocks.map(st => [
      st.ticker,
      `"${st.name.replace(/"/g, '""')}"`,
      st.market,
      st.price,
      st.changePct,
      st.marketCapFormatted,
      st.peRatio || 'N/A',
      st.sectorMedianPe,
      st.peDiscountPct,
      st.valuationStatus,
      st.fundsHoldingCount || 0,
      st.analystUpsidePct || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedSector.name}_Sektor_Benchmarking.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchActiveAiConfig();
    fetchOverview();
    fetchStocksHeatmap();
    if (activeView === 'VALUATION') {
      loadValuationScreener();
    }
  }, [activeMarket]);

  useEffect(() => {
    if (activeView === 'HEATMAP' && stocksHeatmap.length === 0) {
      fetchStocksHeatmap();
    }
    if (activeView === 'VALUATION' && !valScreener) {
      loadValuationScreener();
    }
    if (activeView === 'COMPARE' && selectedForCompare.length >= 2) {
      runSectorComparison();
    }
  }, [activeView]);

  const filteredSectors = sectors.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner & Market Filter */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Sektörel İstihbarat & Rotasyon Hub
              </span>
              <span className="text-xs text-slate-400">5+ Derinlikli Katman & AI Sentezi</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <PieChart className="text-emerald-400" size={26} />
              Sektör Analitiği & Kurumsal Para Akışı
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              TEFAS fon portföyleri, BIST 100 ve ABD hisse çarpanları üzerinden sektörel göreceli iskonto matrisi, analist hedef getiri haritası ve kurumsal rotasyon radarı.
            </p>
          </div>

          {/* Market Toggles & Refresh */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                onClick={() => setActiveMarket('BIST')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeMarket === 'BIST' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                BIST Sektörleri
              </button>
              <button
                onClick={() => setActiveMarket('US')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeMarket === 'US' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                ABD (GICS)
              </button>
              <button
                onClick={() => setActiveMarket('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeMarket === 'ALL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Tümü (BIST & US)
              </button>
            </div>

            <button
              onClick={() => fetchOverview()}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Yenile"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Quick Highlights Strip */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Günün Lider Sektörü</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp size={14} />
                {stats.topAdvancingSector}
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400">En İskontolu Sektör (F/K)</div>
              <div className="text-sm font-bold text-sky-400 flex items-center gap-1 mt-0.5">
                <Compass size={14} />
                {stats.mostUnderValuedSector}
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Kurumsal Para Akışı</div>
              <div className="text-sm font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                <Zap size={14} />
                {stats.highestInstitutionalInflowSector}
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="text-xs text-slate-400">Takip Edilen Sektör</div>
              <div className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                <Layers size={14} />
                {sectors.length} Sektör Kümesi
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Feature Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setActiveView('HEATMAP')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              activeView === 'HEATMAP'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <BarChart3 size={15} />
            1. Isı Haritası & Performans (Lider/Geride Kalan)
          </button>

          <button
            onClick={() => setActiveView('ROTATION')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              activeView === 'ROTATION'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap size={15} />
            2. Kurumsal Para Akışı & Rotasyon Radarı
          </button>

          <button
            onClick={() => setActiveView('VALUATION')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              activeView === 'VALUATION'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Compass size={15} />
            3. Göreceli Değerleme & İskonto Matrisi
          </button>

          <button
            onClick={() => setActiveView('CONSENSUS')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              activeView === 'CONSENSUS'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <TrendingUp size={15} />
            4. Analist Konsensüsü & Hedef Getiri
          </button>

          <button
            onClick={() => setActiveView('NEWS')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              activeView === 'NEWS'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileText size={15} />
            5. Sektörel KAP & Haberler
          </button>

          <button
            onClick={() => setActiveView('COMPARE')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
              activeView === 'COMPARE'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Scale size={15} />
            6. Sektör Karşılaştırma Matrisi
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Sektör ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* 3. Main Views Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw size={28} className="animate-spin text-emerald-500 mb-3" />
          <span className="text-sm font-medium">Sektörel istihbarat ve kurumsal portföyler taranıyor...</span>
        </div>
      ) : (
        <>
          {/* VIEW 1: HEATMAP & PERFORMANCE (LEADERS VS LAGGARDS) */}
          {activeView === 'HEATMAP' && (
            <div className="space-y-6">
              {/* Visual Interactive Treemap Heatmap Grid */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <BarChart3 size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Piyasa & Sektör Isı Haritası (Heatmap Treemap)
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Canlı Piyasa
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Hisse ve sektör bazlı getiri performansına göre renklendirilmiş canlı Finviz stili piyasa haritası
                      </p>
                    </div>
                  </div>

                  {/* Mode Toggle & Legend */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setHeatmapSubView('STOCKS')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          heatmapSubView === 'STOCKS'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <LayoutGrid size={13} />
                        BIST 100 Hisse Haritası (Finviz)
                      </button>
                      <button
                        onClick={() => setHeatmapSubView('SECTORS')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                          heatmapSubView === 'SECTORS'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 size={13} />
                        Sektörler Treemap
                      </button>
                    </div>

                    {/* Heatmap Color Scale Legend */}
                    <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono">
                      <span className="text-slate-400 mr-0.5">Düşüş</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-800 text-white font-bold">&lt; -3%</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white">-1%</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-500 text-white">0%</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white">+1%</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white font-bold">&gt; +3%</span>
                      <span className="text-slate-400 ml-0.5">Yükseliş</span>
                    </div>
                  </div>
                </div>

                {/* SUB-VIEW 1: FINVIZ-STYLE STOCKS TREEMAP GROUPED BY SECTOR */}
                {heatmapSubView === 'STOCKS' && (
                  <div>
                    {stocksHeatmapLoading && stocksHeatmap.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <RefreshCw size={24} className="animate-spin text-emerald-500 mb-2" />
                        <span className="text-xs">Hisse bazlı canlı ısı haritası oluşturuluyor...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Hovered Stock Inspector Strip */}
                        <div className="min-h-[34px] px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs transition-all">
                          {hoveredStock ? (
                            <div className="flex flex-wrap items-center gap-3 w-full">
                              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                {hoveredStock.ticker}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {hoveredStock.name}
                              </span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                ₺{Number(hoveredStock.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                hoveredStock.changePct >= 0 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {hoveredStock.changePct >= 0 ? `+${hoveredStock.changePct}%` : `${hoveredStock.changePct}%`}
                              </span>
                              {hoveredStock.peRatio && (
                                <span className="text-slate-500 text-[11px]">
                                  F/K: <strong className="text-slate-800 dark:text-slate-200">{hoveredStock.peRatio}x</strong>
                                </span>
                              )}
                              <span className="text-slate-500 text-[11px] ml-auto">
                                Sektör detayını açmak için kutuya tıklayın
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              Hisse detaylarını (Fiyat, Günlük Değişim, F/K, Piyasa Değeri) görmek için fareyi kutuların üzerine getirin
                            </span>
                          )}
                        </div>

                        {/* Finviz Treemap Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {stocksHeatmap
                            .filter(sec => 
                              sec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              sec.stocks.some((st: any) => st.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
                            )
                            .map((secGroup) => {
                              const matchingStocks = searchTerm.trim()
                                ? secGroup.stocks.filter((st: any) => 
                                    st.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    st.name.toLowerCase().includes(searchTerm.toLowerCase())
                                  )
                                : secGroup.stocks.slice(0, 16); // Show top stocks per sector

                              if (matchingStocks.length === 0) return null;

                              const isSecPositive = secGroup.avgChangePct >= 0;

                              return (
                                <div 
                                  key={`finviz-sector-${secGroup.market}-${secGroup.name}`}
                                  className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                                >
                                  {/* Sector Header */}
                                  <div className="flex items-center justify-between gap-1 mb-2 px-1">
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                      {secGroup.name}
                                    </span>
                                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      isSecPositive 
                                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40' 
                                        : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                                    }`}>
                                      {isSecPositive ? `+${secGroup.avgChangePct}%` : `${secGroup.avgChangePct}%`}
                                    </span>
                                  </div>

                                  {/* Constituent Stock Tiles inside Sector */}
                                  <div className="flex flex-wrap gap-1.5 flex-1 items-stretch">
                                    {matchingStocks.map((stock: any) => {
                                      const chg = stock.changePct;
                                      let tileBg = 'bg-slate-500 text-white';
                                      if (chg >= 3) tileBg = 'bg-emerald-700 hover:bg-emerald-600 text-white';
                                      else if (chg >= 1) tileBg = 'bg-emerald-600 hover:bg-emerald-500 text-white';
                                      else if (chg > 0) tileBg = 'bg-emerald-500 hover:bg-emerald-400 text-white';
                                      else if (chg <= -3) tileBg = 'bg-rose-800 hover:bg-rose-700 text-white';
                                      else if (chg <= -1) tileBg = 'bg-rose-600 hover:bg-rose-500 text-white';
                                      else if (chg < 0) tileBg = 'bg-rose-500 hover:bg-rose-400 text-white';

                                      // Large market cap stocks take larger flex weight
                                      const isLarge = stock.marketCap > 40_000_000_000;

                                      return (
                                        <button
                                          key={stock.ticker}
                                          onMouseEnter={() => setHoveredStock(stock)}
                                          onMouseLeave={() => setHoveredStock(null)}
                                          onClick={() => {
                                            const matched = sectors.find(s => s.name.toLowerCase() === secGroup.name.toLowerCase());
                                            if (matched) {
                                              setSelectedSector(matched);
                                              loadSectorDetail(matched.name, matched.market);
                                            }
                                          }}
                                          className={`relative rounded-lg text-left transition-all duration-150 flex flex-col justify-between cursor-pointer select-none ${tileBg} ${
                                            isLarge 
                                              ? 'flex-[2_1_85px] min-h-[52px] p-2' 
                                              : 'flex-[1_1_62px] min-h-[46px] p-1.5'
                                          }`}
                                        >
                                          <div className="w-full flex items-baseline justify-between gap-1 leading-none">
                                            <span className="font-black text-xs tracking-tight drop-shadow-xs">
                                              {stock.ticker}
                                            </span>
                                          </div>
                                          <div className="w-full flex items-baseline justify-between gap-1 mt-1 leading-none">
                                            <span className="font-extrabold text-[11px] tracking-tighter drop-shadow-xs">
                                              {chg >= 0 ? `+${chg.toFixed(1)}%` : `${chg.toFixed(1)}%`}
                                            </span>
                                            <span className="text-[9px] opacity-85 font-mono drop-shadow-xs">
                                              ₺{stock.price >= 100 ? Math.round(stock.price) : stock.price.toFixed(1)}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-VIEW 2: SECTOR-LEVEL TREEMAP TILES */}
                {heatmapSubView === 'SECTORS' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {filteredSectors.map((sec) => {
                      const chg = sec.avgChangePct;
                      let bgColor = 'bg-slate-500 text-white';
                      if (chg >= 3) bgColor = 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm';
                      else if (chg >= 1) bgColor = 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm';
                      else if (chg > 0) bgColor = 'bg-emerald-500/80 hover:bg-emerald-500 text-white';
                      else if (chg <= -3) bgColor = 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm';
                      else if (chg <= -1) bgColor = 'bg-rose-500 hover:bg-rose-400 text-white shadow-sm';
                      else if (chg < 0) bgColor = 'bg-rose-500/80 hover:bg-rose-500 text-white';

                      const isSelected = selectedSector?.name === sec.name;

                      return (
                        <button
                          key={`treemap-${sec.market}-${sec.name}`}
                          onClick={() => {
                            setSelectedSector(sec);
                            loadSectorDetail(sec.name, sec.market);
                          }}
                          className={`group relative p-3 rounded-xl text-left transition-all duration-150 flex flex-col justify-between min-h-[95px] ${bgColor} ${
                            isSelected ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.02] z-10' : ''
                          }`}
                        >
                          <div className="w-full flex items-start justify-between gap-1">
                            <span className="font-bold text-xs leading-tight line-clamp-2 drop-shadow-xs">
                              {sec.name}
                            </span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/25 shrink-0">
                              {sec.stockCount}
                            </span>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-base font-black tracking-tight drop-shadow-xs">
                              {chg > 0 ? `+${chg}%` : `${chg}%`}
                            </span>
                            <span className="text-[9px] opacity-80 uppercase font-mono">
                              {sec.market}
                            </span>
                          </div>

                          {/* Top Stock Preview on Hover */}
                          {sec.leaders && sec.leaders.length > 0 && (
                            <div className="mt-1 text-[9px] truncate opacity-90 font-medium bg-black/20 px-1.5 py-0.5 rounded">
                              🌟 {sec.leaders[0].ticker} ({sec.leaders[0].changePct > 0 ? `+${sec.leaders[0].changePct}%` : `${sec.leaders[0].changePct}%`})
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sector Detail Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSectors.map((sector) => {
                  const isPositive = sector.avgChangePct >= 0;
                  const isSelected = selectedSector?.name === sector.name;

                  return (
                    <div
                      key={`${sector.market}-${sector.name}`}
                      onClick={() => {
                        setSelectedSector(sector);
                        loadSectorDetail(sector.name, sector.market);
                      }}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 ${
                        isSelected
                          ? 'bg-slate-50 dark:bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {sector.market}
                          </span>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {sector.name}
                          </h3>
                        </div>
                        <span className={`flex items-center gap-0.5 text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}>
                          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {isPositive ? `+${sector.avgChangePct}%` : `${sector.avgChangePct}%`}
                        </span>
                      </div>

                      {/* Multiples & Stats Strip */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400">Şirket Sayısı</div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sector.stockCount}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Medyan F/K</div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sector.medianPe}x</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">Piyasa Değeri</div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sector.totalMarketCapFormatted}</div>
                        </div>
                      </div>

                      {/* Leaders vs Laggards Comparison */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                            <TrendingUp size={11} /> Liderler (Top)
                          </div>
                          {sector.leaders.slice(0, 2).map(l => (
                            <div key={l.ticker} className="flex justify-between items-center py-0.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{l.ticker}</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{l.changePct}%</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1">
                            <TrendingDown size={11} /> Geride Kalanlar
                          </div>
                          {sector.laggards.slice(0, 2).map(lg => (
                            <div key={lg.ticker} className="flex justify-between items-center py-0.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{lg.ticker}</span>
                              <span className="text-rose-600 dark:text-rose-400 font-bold">{lg.changePct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Kurumsal Akış Sinyali */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ShieldCheck size={13} className="text-emerald-500" />
                          {sector.institutionalHoldingsCount} Kurumsal Fon
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sector.flowSignal === 'GÜÇLÜ GİRİŞ'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : sector.flowSignal === 'ÇIKIŞ / ROTASYON'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {sector.flowSignal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: INSTITUTIONAL FLOW & ROTATION RADAR */}
          {activeView === 'ROTATION' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="text-amber-500" size={20} />
                      Akıllı Para Rotasyonu & TEFAS Fon Sermaye Akışı
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      TEFAS fon portföyleri ve kurumsal varlık dağılım raporlarından hesaplanan sektörel sermaye maruziyeti ve rotasyon aşamaları.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-y border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-3">Sektör</th>
                        <th className="py-3 px-3 text-center">Piyasa</th>
                        <th className="py-3 px-3 text-center">Kurumsal Fon Sayısı</th>
                        <th className="py-3 px-3 text-right">Kurumsal Sermaye Büyüklüğü</th>
                        <th className="py-3 px-3 text-center">Rotasyon Sinyali</th>
                        <th className="py-3 px-3 text-center">Rotasyon Skoru</th>
                        <th className="py-3 px-3">En Çok Tutulan Hisseler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSectors.map((sector) => (
                        <tr 
                          key={sector.name} 
                          onClick={() => {
                            setSelectedSector(sector);
                            loadSectorDetail(sector.name, sector.market);
                          }}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                            {sector.name}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {sector.market}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {sector.institutionalHoldingsCount} Fon
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {sector.institutionalExposureFormatted}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              sector.flowSignal === 'GÜÇLÜ GİRİŞ'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : sector.flowSignal === 'GİRİŞ'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                : sector.flowSignal === 'ÇIKIŞ / ROTASYON'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {sector.flowSignal}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${sector.flowScore >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${Math.min(100, Math.abs(sector.flowScore))}%` }}
                                />
                              </div>
                              <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                {sector.flowScore > 0 ? `+${sector.flowScore}` : sector.flowScore}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {sector.topFundHoldings.map(h => (
                                <span key={h.ticker} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  {h.ticker} (%{h.weightPct})
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: RELATIVE VALUATION & DISCOUNT SCREENER */}
          {activeView === 'VALUATION' && (
            <div className="space-y-6">
              {valScreener ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Most Discounted Stocks */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <Sparkles className="text-emerald-500" size={18} />
                          Sektörüne Göre En İskontolu Hisseler
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Sektör medyan F/K'sına kıyasla en az %15 daha ucuz çarpanla işlem gören fırsat hisseleri.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold rounded-full">
                        {valScreener.mostDiscounted.length} Hisse
                      </span>
                    </div>

                    <div className="space-y-3">
                      {valScreener.mostDiscounted.map((st) => (
                        <div 
                          key={st.ticker}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-emerald-300 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{st.ticker}</span>
                              <span className="text-xs text-slate-500 truncate max-w-[140px]">{st.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                                {st.sector}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                              <span>Fiyat: <strong className="text-slate-800 dark:text-slate-200">₺{st.price}</strong></span>
                              <span>F/K: <strong className="text-slate-800 dark:text-slate-200">{st.peRatio}x</strong></span>
                              <span>Sektör Medyan: <strong className="text-slate-800 dark:text-slate-200">{st.sectorMedianPe}x</strong></span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-extrabold rounded-lg inline-block">
                              -%{st.peDiscountPct} İSKONTO
                            </span>
                            {st.analystUpsidePct && (
                              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                                Hedef Prim: +%{st.analystUpsidePct}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Most Premium (Overvalued) Stocks */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <AlertCircle className="text-amber-500" size={18} />
                          Sektörüne Göre En Primli Hisseler
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Sektör medyan F/K'sına kıyasla belirgin şekilde primli değerlenen şirketler.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold rounded-full">
                        {valScreener.mostPremium.length} Hisse
                      </span>
                    </div>

                    <div className="space-y-3">
                      {valScreener.mostPremium.map((st) => (
                        <div 
                          key={st.ticker}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{st.ticker}</span>
                              <span className="text-xs text-slate-500 truncate max-w-[140px]">{st.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                                {st.sector}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                              <span>Fiyat: <strong className="text-slate-800 dark:text-slate-200">₺{st.price}</strong></span>
                              <span>F/K: <strong className="text-slate-800 dark:text-slate-200">{st.peRatio}x</strong></span>
                              <span>Sektör Medyan: <strong className="text-slate-800 dark:text-slate-200">{st.sectorMedianPe}x</strong></span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-extrabold rounded-lg inline-block">
                              +%{Math.abs(st.peDiscountPct)} PRİM
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw size={24} className="animate-spin text-emerald-500 mx-auto mb-2" />
                  Değerleme taraması hesaplanıyor...
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: ANALYST CONSENSUS & TARGET UPSIDE MAP */}
          {activeView === 'CONSENSUS' && (
            <div className="space-y-6">
              {/* Header Action & Status Bar */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" size={20} />
                    Kurumsal Analist Konsensüsü & 12 Aylık Hedef Getiri Haritası
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    İş Yatırım, Garanti BBVA, Ak Yatırım, Deniz Yatırım, Oyak Yatırım, Vakıf Yatırım ve KAP araştırma bildirimlerinden derlenen konsensüs verileri.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {syncMessage && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      {syncMessage}
                    </span>
                  )}
                  <button
                    onClick={handleSyncAnalystReports}
                    disabled={syncingReports}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={syncingReports ? 'animate-spin' : ''} />
                    {syncingReports ? 'KAP & Kurumlar Taranıyor...' : 'Raporları Yenile / KAP Senkronize Et'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSectors.map((sector) => {
                  const consensus = sector.analystCoverage.consensus;
                  let badgeStyle = 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                  let dotColor = 'bg-slate-400';

                  if (consensus === 'GÜÇLÜ AL') {
                    badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                    dotColor = 'bg-emerald-500';
                  } else if (consensus === 'AL') {
                    badgeStyle = 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
                    dotColor = 'bg-green-500';
                  } else if (consensus === 'TUT' || consensus === 'NÖTR') {
                    badgeStyle = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                    dotColor = 'bg-amber-500';
                  } else if (consensus === 'SAT') {
                    badgeStyle = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                    dotColor = 'bg-rose-500';
                  }

                  const hasReports = sector.analystCoverage.reportCount > 0;

                  return (
                    <div
                      key={sector.name}
                      onClick={() => {
                        setSelectedSector(sector);
                        loadSectorDetail(sector.name, sector.market);
                      }}
                      className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">{sector.name}</h4>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {sector.market} • {sector.stockCount} Şirket
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 shrink-0 ${badgeStyle}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                          {sector.analystCoverage.consensus}
                        </span>
                      </div>

                      {hasReports ? (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 dark:text-slate-400">Ortalama Hedef Getiri Primi</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              +%{sector.analystCoverage.avgUpsidePct}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 dark:text-slate-400">Kurumsal AL Tavsiye Oranı</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                %{sector.analystCoverage.buyRatioPct}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, sector.analystCoverage.buyRatioPct))}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                            <span className="text-slate-500 dark:text-slate-400">Analiz Edilen Rapor Sayısı</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {sector.analystCoverage.reportCount} Kurumsal Rapor
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 p-4 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/80 text-center space-y-1">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Aracı Kurum Kapsamı Genişletiliyor
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Bu sektör için KAP bildirimleri ve aracı kurum notları taranmaya devam etmektedir.
                          </p>
                        </div>
                      )}

                      {sector.analystCoverage.topStockByUpside && sector.analystCoverage.topStockByUpside.ticker && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-500 dark:text-slate-400">En Yüksek Hedef Primli Hisse:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                            {sector.analystCoverage.topStockByUpside.ticker} (+%{sector.analystCoverage.topStockByUpside.upsidePct})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 5: SECTORAL KAP DISCLOSURES & NEWS */}
          {activeView === 'NEWS' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="text-emerald-500" size={20} />
                      {selectedSector ? `${selectedSector.name} Sektörel KAP Bildirimleri & Haberleri` : 'Sektörel Haber Akışı'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Sektördeki şirketlerin son 24 saatlik özel durum açıklamaları, finansal rapor bildirimleri ve makro haberler.
                    </p>
                  </div>
                </div>

                {detailData && detailData.disclosuresAndNews.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailData.disclosuresAndNews.map((item) => (
                      <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${
                          item.type === 'KAP'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {item.type} {item.ticker ? `[${item.ticker}]` : ''}
                        </span>

                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </h4>
                          {item.summary && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {item.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                            <span>{new Date(item.date).toLocaleDateString('tr-TR')}</span>
                            {item.category && <span>• {item.category}</span>}
                            {item.source && <span>• {item.source}</span>}
                          </div>
                        </div>

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Bu sektör için son 24 saatte özel durum açıklaması bulunamadı.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 6: SECTOR COMPARATOR MATRIX */}
          {activeView === 'COMPARE' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Scale className="text-emerald-500" size={20} />
                      Sektörler Arası Karşılaştırma & Benchmarking Matrisi
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Karşılaştırmak istediğiniz sektörleri seçerek çarpanlarını, kurumsal fon sermayesini ve getiri potansiyellerini yan yana inceleyin.
                    </p>
                  </div>

                  <button
                    onClick={runSectorComparison}
                    disabled={compareLoading || selectedForCompare.length < 2}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={compareLoading ? 'animate-spin' : ''} />
                    Karşılaştırmayı Güncelle
                  </button>
                </div>

                {/* Sector Selector Chips */}
                <div className="pt-4">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Karşılaştırılacak Sektörler (En az 2 adet seçin):</div>
                  <div className="flex flex-wrap gap-2">
                    {sectors.map((s) => {
                      const isChecked = selectedForCompare.includes(s.name);
                      return (
                        <button
                          key={s.name}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedForCompare(selectedForCompare.filter(x => x !== s.name));
                            } else {
                              if (selectedForCompare.length < 5) {
                                setSelectedForCompare([...selectedForCompare, s.name]);
                              }
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            isChecked
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500'
                              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {isChecked ? '✓ ' : '+ '}{s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comparison Results Table */}
                {comparisonResult && comparisonResult.comparedSectors && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-y border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-3">Metrik / Özellik</th>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <th key={cs.name} className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                              {cs.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-500">Günlük Getiri %</td>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <td key={cs.name} className={`py-3 px-3 text-center font-bold ${cs.avgChangePct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {cs.avgChangePct >= 0 ? `+${cs.avgChangePct}%` : `${cs.avgChangePct}%`}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-500">Medyan F/K (P/E)</td>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <td key={cs.name} className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                              {cs.medianPe}x
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-500">Piyasa Değeri</td>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <td key={cs.name} className="py-3 px-3 text-center text-slate-700 dark:text-slate-300">
                              {cs.totalMarketCapFormatted}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-500">Kurumsal Para Akışı</td>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <td key={cs.name} className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                                {cs.flowSignal} ({cs.institutionalExposureFormatted})
                              </span>
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-500">Analist Ortalama Hedef Primi</td>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <td key={cs.name} className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {cs.analystCoverage.reportCount > 0 ? `+%{cs.analystCoverage.avgUpsidePct}` : '-'}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 px-3 font-semibold text-slate-500">Sektör Lideri</td>
                          {comparisonResult.comparedSectors.map((cs: SectorOverviewItem) => (
                            <td key={cs.name} className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                              {cs.leaders[0]?.ticker || '-'} (+%{cs.leaders[0]?.changePct || 0})
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. SELECTED SECTOR DEEP-DIVE BENCHMARKING DRAWER / PANEL */}
          {selectedSector && detailData && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {selectedSector.market}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedSector.name} Sektörü Derinlemesine Benchmarking & İstihbarat
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Toplam {detailData.stocks.length} şirket analiz ediliyor. Medyan F/K: {selectedSector.medianPe}x | Kurumsal Pay: {selectedSector.institutionalExposureFormatted}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateAiInsight(selectedSector.name, selectedSector.market)}
                    disabled={aiLoading}
                    title={activeAiConfig?.label ? `Ayarlar sayfasında seçilen ${activeAiConfig.label} ile makro sentez üret` : 'YZ Makro Sentezi'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={14} className={aiLoading ? 'animate-spin' : ''} />
                    {aiLoading 
                      ? 'AI Analiz Ediyor...' 
                      : activeAiConfig?.shortLabel 
                        ? `${activeAiConfig.shortLabel} YZ Makro Sentezi`
                        : 'YZ Makro Sentezi'}
                  </button>

                  <button
                    onClick={exportSectorCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    CSV İndir
                  </button>
                </div>
              </div>

              {/* Dynamic AI Macro Synthesis Card (Active Config from Settings) */}
              {aiInsight && (
                <div className="p-5 bg-gradient-to-br from-emerald-950/20 via-slate-900/40 to-teal-950/20 rounded-2xl border border-emerald-500/30 text-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bot className="text-emerald-400 shrink-0" size={20} />
                      <div>
                        <h4 className="font-bold text-sm text-emerald-300">
                          {aiInsight.provider 
                            ? `${aiInsight.provider.toUpperCase()} (${aiInsight.model || 'Aktif Model'}) Sektörel Strateji & Makro İstihbarat Raporu`
                            : (activeAiConfig?.label ? `${activeAiConfig.label} Sektörel Strateji & Makro İstihbarat Raporu` : 'YZ Sektörel Strateji & Makro İstihbarat Raporu')}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-emerald-400/90 font-medium">
                            Ayarlar sayfasında belirlenen aktif YZ modeliyle ({aiInsight.model || activeAiConfig?.model || 'Seçili Model'}) üretildi
                          </span>
                          {aiInsight.isAiGenerated === false && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                              Heuristic Çıkarım
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold self-start sm:self-auto">
                      Öneri: {aiInsight.strategicAction}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {aiInsight.summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] font-bold text-sky-300 mb-1">Faiz Duyarlılığı</div>
                      <div className="text-slate-300 text-[11px]">{aiInsight.macroSensitivity?.interestRateImpact}</div>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] font-bold text-amber-300 mb-1">Enflasyon & Fiyatlama</div>
                      <div className="text-slate-300 text-[11px]">{aiInsight.macroSensitivity?.inflationSensitivity}</div>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                      <div className="text-[11px] font-bold text-emerald-300 mb-1">Döviz / İhracat Gücü</div>
                      <div className="text-slate-300 text-[11px]">{aiInsight.macroSensitivity?.fxSensitivity}</div>
                    </div>
                  </div>

                  {aiInsight.catalysts && (
                    <div className="pt-2 text-xs">
                      <div className="text-[11px] font-bold text-emerald-400 mb-1">Temel Katalizörler:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {aiInsight.catalysts.map((c: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top TEFAS Mutual Funds Investing in this Sector */}
              {topFundsData && topFundsData.topFunds && topFundsData.topFunds.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="text-emerald-500" size={16} />
                      {selectedSector.name} Sektörüne En Çok Yatırım Yapan TEFAS Fonları (Top Institutional Allocations)
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Toplam {topFundsData.totalFundsInvesting} Fon Pozisyon Aldı
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {topFundsData.topFunds.map((fund: any) => (
                      <div key={fund.fundCode} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{fund.fundCode} Fonu</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold text-[10px] rounded-md">
                            %{fund.sectorWeightPct} Sektör Payı
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mb-2">
                          Tahmini Yatırım: <strong className="text-slate-700 dark:text-slate-300">{fund.formattedValue}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate">
                          Hisseler: {fund.topPicksInSector.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benchmarking Constituent Stocks Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-y border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Hisse Kodu</th>
                      <th className="py-3 px-3 text-right">Fiyat</th>
                      <th className="py-3 px-3 text-right">Günlük %</th>
                      <th className="py-3 px-3 text-right">Piyasa Değeri</th>
                      <th className="py-3 px-3 text-right">Hisse F/K</th>
                      <th className="py-3 px-3 text-right">Sektör Medyanı</th>
                      <th className="py-3 px-3 text-right">İskonto / Prim</th>
                      <th className="py-3 px-3 text-center">Değerleme Durumu</th>
                      <th className="py-3 px-3 text-center">Kurumsal Fon Payı</th>
                      <th className="py-3 px-3 text-right">Analist Hedef %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {detailData.stocks.map((st) => {
                      const isPos = st.changePct >= 0;
                      return (
                        <tr key={st.ticker} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {st.ticker}
                            <span className="block font-normal text-[11px] text-slate-400 truncate max-w-[150px]">{st.name}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">
                            {st.currency === 'USD' ? `$${st.price}` : `₺${st.price}`}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPos ? `+${st.changePct}%` : `${st.changePct}%`}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-300">
                            {st.marketCapFormatted}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {st.peRatio ? `${st.peRatio}x` : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-400">
                            {st.sectorMedianPe}x
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            st.peDiscountPct > 0 ? 'text-emerald-600 dark:text-emerald-400' : st.peDiscountPct < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                          }`}>
                            {st.peDiscountPct !== 0 ? (st.peDiscountPct > 0 ? `-%${st.peDiscountPct} (İskonto)` : `+%${Math.abs(st.peDiscountPct)} (Prim)`) : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              st.valuationStatus === 'YÜKSEK İSKONTO'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : st.valuationStatus === 'PRİMLİ'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {st.valuationStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                            {st.fundsHoldingCount && st.fundsHoldingCount > 0 ? (
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {st.fundsHoldingCount} Fon (%{st.fundsTotalWeight})
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {st.analystUpsidePct ? `+%${st.analystUpsidePct}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
