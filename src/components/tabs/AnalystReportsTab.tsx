import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FileText,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ShieldCheck,
  Building2,
  Globe,
  Coins,
  Briefcase,
  Sparkles,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  X,
  Target,
  Share2,
  Check,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { AnalystReportItem, AnalystMarketConsensus, AnalystMarketType } from '../../types';

interface MarketTabOption {
  id: AnalystMarketType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const MARKET_TABS: MarketTabOption[] = [
  { id: 'ALL', label: 'Tüm Piyasalar', icon: <Layers size={15} /> },
  { id: 'BIST', label: 'BIST & Aracı Kurumlar', icon: <Building2 size={15} />, badge: 'KAP, İş Yatırım, Midas' },
  { id: 'US', label: 'ABD & Wall Street', icon: <Globe size={15} />, badge: 'Benzinga, Finnhub' },
  { id: 'TEFAS', label: 'TEFAS Portföy Bültenleri', icon: <Briefcase size={15} />, badge: 'İş & Ak Portföy' },
  { id: 'CRYPTO', label: 'Kripto Araştırma', icon: <Coins size={15} />, badge: 'CryptoPanic, CoinDesk' },
];

export default function AnalystReportsTab() {
  const [activeMarket, setActiveMarket] = useState<AnalystMarketType>('ALL');
  const [reports, setReports] = useState<AnalystReportItem[]>([]);
  const [consensus, setConsensus] = useState<AnalystMarketConsensus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  // Deep dive ticker modal state
  const [activeTickerConsensus, setActiveTickerConsensus] = useState<any | null>(null);
  const [tickerLoading, setTickerLoading] = useState<boolean>(false);

  // Custom text AI synthesizer modal state
  const [isCustomSynthesizeOpen, setIsCustomSynthesizeOpen] = useState<boolean>(false);
  const [customTicker, setCustomTicker] = useState<string>('THYAO');
  const [customAssetName, setCustomAssetName] = useState<string>('Türk Hava Yolları');
  const [customMarket, setCustomMarket] = useState<string>('BIST');
  const [customSourceName, setCustomSourceName] = useState<string>('Aracı Kurum Raporu');
  const [customRawText, setCustomRawText] = useState<string>('');
  const [customSynthesizing, setCustomSynthesizing] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<any | null>(null);

  // Copied alert state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchReportsAndConsensus = async () => {
    setLoading(true);
    try {
      const [reportsRes, consensusRes] = await Promise.all([
        axios.get('/api/v1/analyst-reports', {
          params: {
            market: activeMarket !== 'ALL' ? activeMarket : undefined,
            search: searchQuery.trim() || undefined,
            sentiment: selectedSentiment !== 'ALL' ? selectedSentiment : undefined,
            recommendation: selectedRecommendation !== 'ALL' ? selectedRecommendation : undefined,
            source: selectedSource !== 'ALL' ? selectedSource : undefined,
            limit: 50,
          },
        }),
        axios.get('/api/v1/analyst-reports/consensus', {
          params: { market: activeMarket },
        }),
      ]);

      if (reportsRes.data?.success) {
        setReports(reportsRes.data.items || []);
      }
      if (consensusRes.data?.success) {
        setConsensus(consensusRes.data.consensus || null);
      }
    } catch (e: any) {
      console.error('Failed to load analyst reports:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndConsensus();
  }, [activeMarket, selectedSentiment, selectedRecommendation, selectedSource]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReportsAndConsensus();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSyncSources = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/v1/analyst-reports/sync');
      if (res.data?.success) {
        setNotification(res.data.message || 'Analist raporları ve piyasa yorumları YZ ile başarıyla sentezlendi.');
        await fetchReportsAndConsensus();
      }
    } catch (e: any) {
      setNotification('Senkronizasyon hatası: ' + e.message);
    } finally {
      setSyncing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleOpenTickerConsensus = async (ticker: string) => {
    setTickerLoading(true);
    try {
      const res = await axios.get(`/api/v1/analyst-reports/ticker/${ticker.toUpperCase()}`);
      if (res.data?.success) {
        setActiveTickerConsensus(res.data);
      }
    } catch (e: any) {
      console.error('Failed to load ticker consensus:', e.message);
    } finally {
      setTickerLoading(false);
    }
  };

  const handleRunCustomSynthesize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRawText.trim()) return;
    setCustomSynthesizing(true);
    try {
      const res = await axios.post('/api/v1/analyst-reports/synthesize', {
        ticker: customTicker,
        assetName: customAssetName,
        market: customMarket,
        sourceName: customSourceName,
        rawText: customRawText,
      });
      if (res.data?.success) {
        setCustomResult(res.data.synthesis);
      }
    } catch (e: any) {
      alert('YZ Sentezleme hatası: ' + e.message);
    } finally {
      setCustomSynthesizing(false);
    }
  };

  const handleCopySummary = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Distinct sources list
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.sourceName) set.add(r.sourceName);
    });
    return Array.from(set);
  }, [reports]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Architectural Disclaimer */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText size={22} />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Analist Yorumları & Araştırma Masası
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                YZ Sentez Katmanı
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              BIST aracı kurumları (KAP, İş Yatırım, Midas, ParaBorsa), Wall Street (Benzinga, Finnhub), TEFAS portföy şirketleri ve Kripto analizlerinin telif korumalı yapay zeka çıkarımları.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setIsCustomSynthesizeOpen(true)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} className="text-indigo-500" />
              <span>Serbest Metin Sentezle</span>
            </button>

            <button
              onClick={handleSyncSources}
              disabled={syncing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Kaynaklar Taranıyor...' : 'Yeni Raporları Çek & YZ Sentezle'}</span>
            </button>
          </div>
        </div>

        {/* ToS / Copyright Protection Protocol Notice */}
        <div className="mt-4 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Telif & ToS Güvenlik Protokolü:</span> Aracı kurumlar ve haber kaynaklarının yayınladığı araştırma notları, platformun Yapay Zeka (AI) ara katmanı tarafından işlenerek özgün analitik sentez, duyarlılık skoru, boğa katalizörleri ve ayı risklerine dönüştürülmüştür. Üçüncü taraf telif haklarını korumak adına ham metinler sunulmamakta, tamamen bağımsız algoritmik çıkarımlar sağlanmaktadır.
          </div>
        </div>

        {notification && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* 2. Top KPI Consensus Summary */}
      {consensus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Analiz Edilen Rapor</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{consensus.totalReports}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">araştırma notu</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1">
              <Building2 size={12} />
              <span>{consensus.sourcesCount} farklı kurumsal kaynak</span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Konsensüs Görünümü</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">%{consensus.bullishRatioPct}</span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Boğa (Al)</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{consensus.positiveCount} Pozitif</span>
              <span>•</span>
              <span className="text-neutral-600 dark:text-neutral-400">{consensus.neutralCount} Nötr</span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400">{consensus.negativeCount} Negatif</span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Ortalama Hedef Getiri</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">+%{consensus.averageUpsidePct}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">potansiyel</span>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1">
              <Target size={12} className="text-blue-500" />
              <span>12 aylık kurum hedefleri</span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Taranan Kurumlar</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">İş Yatırım</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">KAP</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">Midas</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">ParaBorsa</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">Benzinga</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-700 dark:text-neutral-300">CryptoPanic</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Top Recommended Tickers Bar */}
      {consensus && consensus.topRecommendedTickers && consensus.topRecommendedTickers.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs flex items-center gap-3 overflow-x-auto">
          <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 shrink-0 flex items-center gap-1.5 pl-1">
            <TrendingUp size={15} className="text-emerald-500" />
            <span>En Çok Önerilenler:</span>
          </div>

          <div className="flex items-center gap-2">
            {consensus.topRecommendedTickers.map((item) => (
              <button
                key={item.ticker}
                onClick={() => {
                  setSearchQuery(item.ticker);
                  handleOpenTickerConsensus(item.ticker);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all flex items-center gap-2 shrink-0 text-left cursor-pointer group"
              >
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {item.ticker}
                </span>
                {item.avgUpsidePct && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    +%{item.avgUpsidePct}
                  </span>
                )}
                <span className="text-[10px] px-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {item.buyCount} Al
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Market Selection Tabs & Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          {MARKET_TABS.map((tab) => {
            const isActive = activeMarket === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMarket(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-200 dark:bg-neutral-200 dark:text-neutral-800'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hisse, fon veya şirket ara (THYAO, NVDA, BTC...)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sentiment Filter */}
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tüm Duyarlılıklar (Sentiment)</option>
            <option value="POZİTİF">Pozitif (Boğa)</option>
            <option value="NÖTR">Nötr (Dengeli)</option>
            <option value="NEGATİF">Negatif (Ayı)</option>
          </select>

          {/* Recommendation Filter */}
          <select
            value={selectedRecommendation}
            onChange={(e) => setSelectedRecommendation(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tüm Tavsiyeler (Al / Tut / Sat)</option>
            <option value="AL">AL / Strong Buy</option>
            <option value="TUT">TUT / Neutral</option>
            <option value="SAT">SAT / Underperform</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tüm Kaynaklar ({availableSources.length})</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Reports Listing */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw size={28} className="animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Analist araştırma raporları ve YZ sentezleri yükleniyor...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
          <FileText size={36} className="text-neutral-400 mx-auto" />
          <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Kriterlere uygun analiz raporu bulunamadı</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Farklı bir arama terimi deneyebilir veya "Yeni Raporları Çek & YZ Sentezle" butonu ile kaynakları güncelleyebilirsiniz.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSentiment('ALL');
              setSelectedRecommendation('ALL');
              setSelectedSource('ALL');
            }}
            className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => {
            const isBullish = ['AL', 'OVERWEIGHT', 'BULLISH'].includes(report.recommendation.toUpperCase());
            const isBearish = ['SAT', 'UNDERWEIGHT', 'BEARISH'].includes(report.recommendation.toUpperCase());

            return (
              <div
                key={report.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4.5 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Source, Date, Recommendation */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                        {report.ticker}
                      </span>
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate max-w-[140px]">
                        {report.assetName}
                      </span>
                      <span className="text-[10px] text-neutral-400">•</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                        {report.sourceName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                          isBullish
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : isBearish
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {report.recommendation}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                    {report.title}
                  </h3>

                  {/* Target Price & Upside Ribbon */}
                  {(report.targetPrice || report.upsidePct) && (
                    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Target size={13} className="text-blue-500 shrink-0" />
                        <span className="text-neutral-500">Hedef Fiyat:</span>
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">
                          {report.targetPrice} {report.currency}
                        </span>
                      </div>
                      {report.upsidePct && (
                        <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <TrendingUp size={13} />
                          <span>+%{report.upsidePct} Potansiyel</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Synthesis Box */}
                  <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      <Sparkles size={13} />
                      <span>Yapay Zeka Analitik Sentezi:</span>
                    </div>
                    <p>{report.aiSummary}</p>
                  </div>

                  {/* Key Catalysts & Risks Chips */}
                  <div className="space-y-2 pt-1">
                    {report.keyBullArguments && report.keyBullArguments.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Boğa Katalizörleri / Büyüme Nedenleri:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {report.keyBullArguments.map((arg, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                            >
                              {arg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.keyBearRisks && report.keyBearRisks.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>Ayı Riskleri & Çekinceler:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {report.keyBearRisks.map((risk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[11px] bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                            >
                              {risk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Bar: Date, Author, Deep Dive Action */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <span className="truncate max-w-[150px]">
                    {new Date(report.publishDate).toLocaleDateString('tr-TR')} • {report.author || report.sourceName}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopySummary(report.id, `${report.ticker} (${report.recommendation}): ${report.aiSummary}`)}
                      title="Sentezi Kopyala"
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      {copiedId === report.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                    </button>

                    <button
                      onClick={() => handleOpenTickerConsensus(report.ticker)}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Tüm Konsensüs</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Ticker Deep Dive Consensus Modal */}
      {activeTickerConsensus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-sm font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {activeTickerConsensus.ticker}
                  </span>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {activeTickerConsensus.assetName}
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {activeTickerConsensus.reportCount} aracı kurum ve analist raporunun birleşik konsensüs analizi
                </p>
              </div>

              <button
                onClick={() => setActiveTickerConsensus(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Consensus Top Highlights */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <p className="text-[11px] text-neutral-500">Konsensüs Tavsiyesi</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activeTickerConsensus.consensusRecommendation}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {activeTickerConsensus.bullCount} Al / {activeTickerConsensus.neutralCount} Tut / {activeTickerConsensus.bearCount} Sat
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <p className="text-[11px] text-neutral-500">Ort. Hedef Fiyat</p>
                <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                  {activeTickerConsensus.avgTargetPrice ? `${activeTickerConsensus.avgTargetPrice} TL` : '—'}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">12 aylık kurum ortalaması</p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                <p className="text-[11px] text-neutral-500">Beklenen Getiri</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {activeTickerConsensus.avgUpsidePct ? `+%{activeTickerConsensus.avgUpsidePct}` : '—'}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">Potansiyel Prim</p>
              </div>
            </div>

            {/* AI Executive Consensus Statement */}
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles size={14} />
                <span>Yapay Zeka Yönetici Özeti (Executive Consensus):</span>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {activeTickerConsensus.aiExecutiveConsensus}
              </p>
            </div>

            {/* Combined Catalysts & Risks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Ortak Boğa Argümanları:</span>
                </div>
                <ul className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1 pl-4 list-disc">
                  {activeTickerConsensus.combinedBullArguments.map((b: string, i: number) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-2">
                <div className="text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  <span>Ortak Risk & Çekinceler:</span>
                </div>
                <ul className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1 pl-4 list-disc">
                  {activeTickerConsensus.combinedBearRisks.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setActiveTickerConsensus(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Custom Free-Text AI Synthesizer Modal */}
      {isCustomSynthesizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <span>Serbest Analist Metnini YZ ile Sentezle</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Aracı kurum bültenlerinden veya web sitelerinden kopyaladığınız serbest metni yapay zekaya vererek telif güvenli analitik sentezini üretin.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsCustomSynthesizeOpen(false);
                  setCustomResult(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRunCustomSynthesize} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Hisse / Varlık Kodu
                  </label>
                  <input
                    type="text"
                    value={customTicker}
                    onChange={(e) => setCustomTicker(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    placeholder="THYAO, NVDA, BTC..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Kaynak veya Kurum Adı
                  </label>
                  <input
                    type="text"
                    value={customSourceName}
                    onChange={(e) => setCustomSourceName(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    placeholder="İş Yatırım, ParaBorsa vb."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Ham Analist Metni / Yorumu
                </label>
                <textarea
                  value={customRawText}
                  onChange={(e) => setCustomRawText(e.target.value)}
                  required
                  rows={5}
                  placeholder="Aracı kurumun hisse analizi, hedef fiyat gerekçesi veya piyasa yorumu metnini buraya yapıştırın..."
                  className="w-full p-3 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomSynthesizeOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={customSynthesizing || !customRawText.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={14} className={customSynthesizing ? 'animate-spin' : ''} />
                  <span>{customSynthesizing ? 'Sentezleniyor...' : 'Yapay Zeka ile Sentezle'}</span>
                </button>
              </div>
            </form>

            {/* Result Box */}
            {customResult && (
              <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Üretilen Telif Güvenli Sentez
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {customResult.recommendation} ({customResult.aiSentiment})
                  </span>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {customResult.aiSummary}
                </p>

                {customResult.targetPrice && (
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Tespit Edilen Hedef Fiyat: {customResult.targetPrice} TL {customResult.upsidePct && `(%${customResult.upsidePct})`}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">
                    <span className="font-semibold block mb-0.5">Katalizörler:</span>
                    {customResult.keyBullArguments?.join(', ')}
                  </div>
                  <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300">
                    <span className="font-semibold block mb-0.5">Riskler:</span>
                    {customResult.keyBearRisks?.join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
