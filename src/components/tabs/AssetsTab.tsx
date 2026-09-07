import React, { useState, useEffect } from 'react';
import { 
  Search, Database, TrendingUp, TrendingDown, Layers, ShieldCheck, 
  Building2, Newspaper, Target, CheckCircle2, AlertCircle, RefreshCw,
  BarChart3, Sparkles, ExternalLink, ArrowUpRight, ArrowDownRight,
  PieChart, Activity, Award, Briefcase, FileText, ChevronRight, Zap
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { apiFetch } from '../../lib/api';

interface AssetSummaryItem {
  code: string;
  name: string;
  type: string;
  market: string;
  price?: number;
  changePct?: number;
  currency: string;
  analystReportCount: number;
  consensusRecommendation?: string;
  targetPrice?: number;
  upsidePct?: number;
  fundsHoldingCount: number;
  disclosuresCount: number;
  hasValuation: boolean;
  completenessScore: number;
  linkedLayers: string[];
}

interface AssetProfileData {
  asset: {
    code: string;
    name: string;
    type: string;
    market: string;
    sector?: string;
    industry?: string;
    currency: string;
    exchange?: string;
    isinCode?: string;
    description?: string;
    isActive: boolean;
    registeredId?: number;
  };
  priceData: {
    price: number;
    changePct: number;
    change?: number;
    volume?: number;
    marketCap?: number;
    marketCapFormatted?: string;
    peRatio?: number;
    forwardPe?: number;
    pbRatio?: number;
    dividendYield?: number;
    eps?: number;
    beta?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    currency: string;
  };
  analyst: {
    hasData: boolean;
    reportCount: number;
    consensusRecommendation: string;
    avgTargetPrice: number;
    avgUpsidePct: number;
    currency: string;
    bullCount: number;
    neutralCount: number;
    bearCount: number;
    combinedBullArguments: string[];
    combinedBearRisks: string[];
    reports: Array<{
      id: number;
      source: string;
      sourceName: string;
      sourceUrl?: string | null;
      author?: string | null;
      title: string;
      recommendation: string | null;
      targetPrice: number | null;
      upsidePct: number | null;
      publishDate: string;
      aiSummary: string | null;
      aiSentiment: string | null;
      keyBullArguments: string[];
      keyBearRisks: string[];
    }>;
  };
  institutionalHoldings: {
    hasData: boolean;
    type: 'HELD_BY_TEFAS_FUNDS' | 'HELD_BY_US_ETFS' | 'FUND_PORTFOLIO_HOLDINGS' | 'NONE';
    summary: string;
    totalCount: number;
    totalWeightExposure?: number;
    items: Array<{
      code: string;
      name: string;
      weightPct: number;
      nominalShares?: number;
      marketValue?: number;
      categoryOrSector?: string;
    }>;
  };
  disclosures: {
    hasData: boolean;
    totalCount: number;
    items: Array<{
      id: number;
      disclosureIndex: string;
      title: string;
      publishDate: string | null;
      category: string | null;
      summary: string | null;
      url: string | null;
    }>;
  };
  valuation: {
    hasData: boolean;
    model: 'BUFFETT_DCF' | 'STANDARD_MULTIPLES' | 'NAV_BASED';
    ownerEarnings?: number;
    dcfIntrinsicValue?: number;
    marginOfSafetyPct?: number;
    buffettScore?: {
      passedCriteriaCount: number;
      totalCriteriaCount: number;
      overallVerdict: 'GÜÇLÜ UYGUN' | 'MAKUL' | 'UYGUN DEĞİL';
      criteria: Array<{
        title: string;
        value: string;
        target: string;
        passed: boolean;
        desc: string;
      }>;
    };
  };
  technicals: {
    hasData: boolean;
    rsi14?: number;
    macd?: number;
    macdSignal?: number;
    sma50?: number;
    sma200?: number;
    trendVerdict: 'GÜÇLÜ BOĞA' | 'BOĞA' | 'NÖTR' | 'AYI' | 'AŞIRI SATIM (FIRSAT)';
  };
  historical: {
    hasData: boolean;
    pointsCount: number;
    timeframe: string;
    candles: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
    }>;
  };
  news: {
    hasData: boolean;
    totalCount: number;
    items: Array<{
      id: string | number;
      title: string;
      body?: string | null;
      source: string | null;
      publishedOn: string;
      sentiment?: string | null;
      url?: string | null;
    }>;
  };
  onChain?: {
    hasData: boolean;
    inOutMoneyPct?: number;
    outMoneyPct?: number;
    largeTxsVolumeUsd?: number;
    largeTxsCount?: number;
    networkGrowthPct?: number;
    concentrationWhalesPct?: number;
    sentimentScore?: string | null;
    summaryText?: string | null;
  };
  ipo?: {
    hasData: boolean;
    status: string;
    dateStr?: string | null;
    price?: string | null;
    ceilingStreak?: number | null;
    totalReturnPct?: string | null;
    discountRate?: string | null;
    fundUsage?: string | null;
    aiSummary?: string | null;
  };
  linkageRadar: {
    connectedLayersCount: number;
    totalEligibleLayers: number;
    completenessScore: number;
    layers: {
      analyst: boolean;
      institutionalHoldings: boolean;
      disclosures: boolean;
      valuation: boolean;
      technicals: boolean;
      historical: boolean;
      news: boolean;
      onChain: boolean;
      ipo: boolean;
    };
    verdict: string;
  };
}

export default function AssetsTab() {
  const [selectedTicker, setSelectedTicker] = useState('THYAO');
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'BIST' | 'US' | 'TEFAS' | 'CRYPTO'>('ALL');
  const [onlyWithAnalyst, setOnlyWithAnalyst] = useState(false);
  const [onlyWithHoldings, setOnlyWithHoldings] = useState(false);

  // Data states
  const [profile, setProfile] = useState<AssetProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Asset list states
  const [assetList, setAssetList] = useState<AssetSummaryItem[]>([]);
  const [listStats, setListStats] = useState<any>(null);
  const [listLoading, setListLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Sub-view tab inside profile
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'ANALYST' | 'HOLDINGS' | 'VALUATION' | 'DISCLOSURES' | 'NEWS'>('OVERVIEW');

  // Quick ticker suggestions
  const quickTickers = [
    { code: 'THYAO', name: 'Türk Hava Yolları', market: 'BIST' },
    { code: 'NVDA', name: 'Nvidia Corp.', market: 'US' },
    { code: 'BTC', name: 'Bitcoin', market: 'CRYPTO' },
    { code: 'MAC', name: 'Marmara Capital Fonu', market: 'TEFAS' },
    { code: 'ASELS', name: 'Aselsan', market: 'BIST' },
    { code: 'AAPL', name: 'Apple Inc.', market: 'US' },
    { code: 'GARAN', name: 'Garanti BBVA', market: 'BIST' },
    { code: 'TCD', name: 'Tacirler Değişken Fon', market: 'TEFAS' },
    { code: 'ETH', name: 'Ethereum', market: 'CRYPTO' },
    { code: 'TUPRS', name: 'Tüpraş', market: 'BIST' },
  ];

  // Load Profile
  const loadProfile = async (ticker: string) => {
    if (!ticker) return;
    try {
      setProfileLoading(true);
      setProfileError(null);
      const res = await apiFetch(`/api/v1/assets/profile/${ticker.toUpperCase()}`);
      if (!res.ok) throw new Error('Varlık profili yüklenemedi.');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Varlık bulunamadı');
      setProfile(data);
      setSelectedTicker(ticker.toUpperCase());
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Load Linked Assets List
  const loadAssetList = async () => {
    try {
      setListLoading(true);
      const params = new URLSearchParams();
      if (marketFilter !== 'ALL') params.set('market', marketFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (onlyWithAnalyst) params.set('hasAnalyst', 'true');
      if (onlyWithHoldings) params.set('hasHoldings', 'true');
      params.set('limit', '30');

      const res = await apiFetch(`/api/v1/assets/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssetList(data.items || []);
        setListStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load asset list:', err);
    } finally {
      setListLoading(false);
    }
  };

  // Trigger master sync
  const handleSyncRegistry = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      const res = await apiFetch('/api/v1/assets/sync-registry', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`Senkronizasyon Başarılı: ${data.totalRegistered} varlık eşleştirildi (${data.newAdded} yeni varlık eklendi). Sıfır boşta veri.`);
        await loadAssetList();
        await loadProfile(selectedTicker);
      } else {
        setSyncMessage('Senkronizasyon arka planda zaten çalışıyor.');
      }
    } catch (err: any) {
      setSyncMessage(`Hata: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadProfile(selectedTicker);
  }, []);

  useEffect(() => {
    loadAssetList();
  }, [marketFilter, onlyWithAnalyst, onlyWithHoldings]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      loadProfile(searchQuery.trim());
      loadAssetList();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Multi-Layer Linkage Status */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Layers size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  360° Varlık Veri Eşleştirme & İstihbarat Merkezi
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck size={12} />
                  Sıfır Boşta Veri
                </span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Tüm veri kaynakları (Analist Yorumları, TEFAS Kurumsal Fon Portföy Payları, KAP Bildirimleri, Buffett DCF ve Teknikler) ilgili varlıklarla birebir eşleştirilmiştir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSyncRegistry}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Eşleştiriliyor...' : 'Tüm Tabloları Çapraz Eşle'}
            </button>
          </div>
        </div>

        {/* Sync Success / Info Message */}
        {syncMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Global Linkage Metrics */}
        {listStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400 block font-medium">Toplam Kayıtlı Varlık</span>
              <span className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5 block font-mono">
                {listStats.totalAssets.toLocaleString('tr-TR')}
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400 block font-medium">BIST Hisseleri</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5 block font-mono">
                {listStats.bistCount}
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400 block font-medium">ABD Hisseleri & ETF</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block font-mono">
                {listStats.usCount + listStats.etfCount}
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400 block font-medium">TEFAS Fonları</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block font-mono">
                {listStats.tefasCount}
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400 block font-medium">🎯 Analist Konsensüsü</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                {listStats.withAnalystReportsCount} Varlık
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl">
              <span className="text-neutral-500 dark:text-neutral-400 block font-medium">🏛️ Kurumsal Sahiplik</span>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 block font-mono">
                {listStats.withInstitutionalHoldingsCount} Varlık
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Search & Popular Chips */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute inset-y-0 left-3.5 my-auto text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Varlık kodu veya şirket/fon adı arayın (Örn: THYAO, NVDA, BTC, MAC, ASELS, AAPL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-shadow text-neutral-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <Search size={15} />
            360° Sorgula
          </button>
        </form>

        {/* Quick Ticker Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-xs font-semibold text-neutral-400">Hızlı Varlık Seçimi:</span>
          {quickTickers.map((t) => (
            <button
              key={t.code}
              onClick={() => loadProfile(t.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                selectedTicker === t.code
                  ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                  : 'bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <span className="font-bold">{t.code}</span>
              <span className="text-[10px] opacity-75">({t.market})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {profileLoading && (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <RefreshCw size={28} className="animate-spin text-violet-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {selectedTicker} için tüm veri katmanları (Analist, TEFAS, KAP, Buffett DCF, Teknikler) çapraz sorgulanıyor...
          </p>
        </div>
      )}

      {/* Error State */}
      {profileError && !profileLoading && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{profileError}</span>
        </div>
      )}

      {/* 360° Profile Card */}
      {profile && !profileLoading && (
        <div className="space-y-6">
          {/* Main Asset Header Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Identity */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                    profile.asset.market === 'BIST'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : profile.asset.market === 'US'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                        : profile.asset.market === 'CRYPTO'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : profile.asset.market === 'TEFAS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}>
                    {profile.asset.market}
                  </span>
                  {profile.asset.exchange && (
                    <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-mono">
                      {profile.asset.exchange}
                    </span>
                  )}
                  {profile.asset.sector && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      • {profile.asset.sector}
                    </span>
                  )}
                  {profile.asset.isinCode && (
                    <span className="text-[11px] font-mono text-neutral-400">
                      ISIN: {profile.asset.isinCode}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    {profile.asset.code}
                  </h2>
                  <span className="text-lg font-semibold text-neutral-600 dark:text-neutral-300">
                    {profile.asset.name}
                  </span>
                </div>

                {profile.asset.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
                    {profile.asset.description}
                  </p>
                )}
              </div>

              {/* Right: Price & Key Metrics */}
              <div className="flex flex-wrap items-center lg:items-end flex-col sm:flex-row gap-4 lg:gap-6 border-t lg:border-t-0 pt-4 lg:pt-0 border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="text-xs text-neutral-400 font-medium block">Piyasa Fiyatı</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold font-mono text-neutral-900 dark:text-white">
                      {profile.priceData.price > 0 
                        ? profile.priceData.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : '-'}
                    </span>
                    <span className="text-sm font-bold text-neutral-500">
                      {profile.priceData.currency === 'TRY' ? '₺' : profile.priceData.currency === 'USD' ? '$' : profile.priceData.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded ${
                      profile.priceData.changePct >= 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {profile.priceData.changePct >= 0 ? <TrendingUp size={13} className="mr-1" /> : <TrendingDown size={13} className="mr-1" />}
                      {profile.priceData.changePct >= 0 ? '+' : ''}{profile.priceData.changePct.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-neutral-400 font-medium">Günlük Değişim</span>
                  </div>
                </div>

                {/* Additional Fast Badges */}
                <div className="flex sm:flex-col gap-2 text-right">
                  {profile.analyst.hasData && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl text-left">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <Target size={12} />
                        Analist Konsensüsü
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-white mt-0.5">
                        {profile.analyst.consensusRecommendation} • Hedef {profile.analyst.avgTargetPrice} {profile.priceData.currency === 'TRY' ? '₺' : '$'}
                        {profile.analyst.avgUpsidePct > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 ml-1">(+%{profile.analyst.avgUpsidePct})</span>
                        )}
                      </div>
                    </div>
                  )}

                  {profile.institutionalHoldings.hasData && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 rounded-xl text-left">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                        <Building2 size={12} />
                        Kurumsal Sahiplik
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-white mt-0.5">
                        {profile.institutionalHoldings.type === 'HELD_BY_TEFAS_FUNDS'
                          ? `${profile.institutionalHoldings.totalCount} TEFAS Fonunda Taşınıyor`
                          : profile.institutionalHoldings.type === 'HELD_BY_US_ETFS'
                            ? `${profile.institutionalHoldings.totalCount} Wall Street ETF'inde`
                            : `${profile.institutionalHoldings.totalCount} Portföy Menkul Kıymeti`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 360° Linkage Radar (Eşleşme Durumu Barı) */}
            <div className="mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Veri Eşleşme Radarı (Linkage Matrix)
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">
                    • {profile.linkageRadar.connectedLayersCount}/{profile.linkageRadar.totalEligibleLayers} Katman Aktif
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    {profile.linkageRadar.verdict}
                  </span>
                  <span className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-700 dark:text-neutral-300">
                    %{profile.linkageRadar.completenessScore}
                  </span>
                </div>
              </div>

              {/* Connected Layers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.analyst
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <Target size={14} className={profile.linkageRadar.layers.analyst ? 'text-emerald-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">Analist Notları</span>
                    <span className="text-[10px] opacity-80">{profile.analyst.hasData ? `${profile.analyst.reportCount} Rapor` : 'Boşta Değil'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.institutionalHoldings
                    ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <Building2 size={14} className={profile.linkageRadar.layers.institutionalHoldings ? 'text-purple-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">Kurumsal Pay</span>
                    <span className="text-[10px] opacity-80">{profile.institutionalHoldings.hasData ? `${profile.institutionalHoldings.totalCount} Fon` : 'N/A'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.valuation
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <Award size={14} className={profile.linkageRadar.layers.valuation ? 'text-blue-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">Buffett & DCF</span>
                    <span className="text-[10px] opacity-80">{profile.valuation.hasData ? `${profile.valuation.marginOfSafetyPct}% Marj` : 'Hazır'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.disclosures
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <FileText size={14} className={profile.linkageRadar.layers.disclosures ? 'text-amber-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">KAP Bildirimi</span>
                    <span className="text-[10px] opacity-80">{profile.disclosures.hasData ? `${profile.disclosures.totalCount} Bildirim` : 'Takipte'}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.technicals
                    ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <Activity size={14} className={profile.linkageRadar.layers.technicals ? 'text-teal-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">Teknik Analiz</span>
                    <span className="text-[10px] opacity-80">RSI {profile.technicals.rsi14 || 50}</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.historical
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <BarChart3 size={14} className={profile.linkageRadar.layers.historical ? 'text-indigo-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">Fiyat Mumları</span>
                    <span className="text-[10px] opacity-80">{profile.historical.pointsCount} Gün</span>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  profile.linkageRadar.layers.news
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                }`}>
                  <Newspaper size={14} className={profile.linkageRadar.layers.news ? 'text-rose-600' : 'text-neutral-400'} />
                  <div>
                    <span className="font-bold block text-[11px]">Piyasa Haberi</span>
                    <span className="text-[10px] opacity-80">{profile.news.hasData ? `${profile.news.totalCount} Haber` : 'Canlı Akış'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs for Deep Dive */}
          <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto pb-1 text-sm font-semibold">
            <button
              onClick={() => setActiveSubTab('OVERVIEW')}
              className={`px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-2 ${
                activeSubTab === 'OVERVIEW'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Zap size={16} />
              Genel Bakış & Fiyat Eğrisi
            </button>

            <button
              onClick={() => setActiveSubTab('ANALYST')}
              className={`px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-2 ${
                activeSubTab === 'ANALYST'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Target size={16} />
              🎯 Analist Yorumları & Konsensüs ({profile.analyst.reportCount})
            </button>

            <button
              onClick={() => setActiveSubTab('HOLDINGS')}
              className={`px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-2 ${
                activeSubTab === 'HOLDINGS'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Building2 size={16} />
              🏛️ Kurumsal Portföy & TEFAS ({profile.institutionalHoldings.totalCount})
            </button>

            {profile.valuation.hasData && (
              <button
                onClick={() => setActiveSubTab('VALUATION')}
                className={`px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-2 ${
                  activeSubTab === 'VALUATION'
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Award size={16} />
                💎 Buffett & DCF Değerleme
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('DISCLOSURES')}
              className={`px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-2 ${
                activeSubTab === 'DISCLOSURES'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <FileText size={16} />
              📢 KAP Bildirimleri ({profile.disclosures.totalCount})
            </button>

            <button
              onClick={() => setActiveSubTab('NEWS')}
              className={`px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-2 ${
                activeSubTab === 'NEWS'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Newspaper size={16} />
              📰 Haber Akışı & Duyarlılık ({profile.news.totalCount})
            </button>
          </div>

          {/* TAB 1: OVERVIEW & CHART */}
          {activeSubTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Price Area Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-violet-600" />
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Tarihsel Fiyat & Trend Eğrisi (Son {profile.historical.candles.length} Bar)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                    <span>Zaman Dilimi: Günlük (1D)</span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profile.historical.candles}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#888888" 
                        fontSize={11} 
                        tickLine={false}
                        tickFormatter={(val) => val.slice(5)}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={11} 
                        tickLine={false} 
                        domain={['auto', 'auto']}
                        tickFormatter={(val) => `${val.toLocaleString('tr-TR')}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          borderColor: '#333333', 
                          borderRadius: '8px', 
                          color: '#fff',
                          fontSize: '12px' 
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#7c3aed" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#priceGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Technical Indicators Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
                    <span className="text-neutral-400 font-medium block">RSI (14)</span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white font-mono mt-0.5 block">
                      {profile.technicals.rsi14 || '-'}
                    </span>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
                    <span className="text-neutral-400 font-medium block">50 Günlük AO</span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white font-mono mt-0.5 block">
                      {profile.technicals.sma50 ? profile.technicals.sma50.toLocaleString('tr-TR') : '-'}
                    </span>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
                    <span className="text-neutral-400 font-medium block">200 Günlük AO</span>
                    <span className="text-base font-bold text-neutral-900 dark:text-white font-mono mt-0.5 block">
                      {profile.technicals.sma200 ? profile.technicals.sma200.toLocaleString('tr-TR') : '-'}
                    </span>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
                    <span className="text-neutral-400 font-medium block">Teknik Trend</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {profile.technicals.trendVerdict}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Col: Valuation & Quick Links */}
              <div className="space-y-4">
                {/* Valuation Snippet */}
                {profile.valuation.hasData && (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Buffett DCF İçsel Değeri
                      </span>
                      <Award size={16} className="text-amber-500" />
                    </div>

                    <div className="text-2xl font-extrabold font-mono text-neutral-900 dark:text-white">
                      {profile.valuation.dcfIntrinsicValue?.toLocaleString('tr-TR')} {profile.priceData.currency === 'TRY' ? '₺' : '$'}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Güvenlik Marjı:</span>
                      <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                        (profile.valuation.marginOfSafetyPct || 0) > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                      }`}>
                        {(profile.valuation.marginOfSafetyPct || 0) > 0 ? '+' : ''}
                        {profile.valuation.marginOfSafetyPct}% İskonto
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
                      Karne: {profile.valuation.buffettScore?.passedCriteriaCount}/6 Kriter Karşılandı ({profile.valuation.buffettScore?.overallVerdict})
                    </div>
                  </div>
                )}

                {/* On-Chain Snippet (if crypto) */}
                {profile.onChain?.hasData && (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Zincir Üstü (On-Chain) Metrikler
                      </span>
                      <Activity size={16} className="text-teal-500" />
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Karda Olan Cüzdanlar:</span>
                        <span className="font-bold text-emerald-600 font-mono">%{profile.onChain.inOutMoneyPct}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Büyük İşlem (Balina) Hacmi:</span>
                        <span className="font-bold text-neutral-900 dark:text-white font-mono">${(profile.onChain.largeTxsVolumeUsd! / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Balina Konsantrasyonu:</span>
                        <span className="font-bold text-neutral-900 dark:text-white font-mono">%{profile.onChain.concentrationWhalesPct}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 leading-relaxed">
                      {profile.onChain.summaryText}
                    </p>
                  </div>
                )}

                {/* IPO Snippet (if IPO) */}
                {profile.ipo?.hasData && (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                      Halka Arz Bilgisi
                    </span>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white">
                      Arz Fiyatı: {profile.ipo.price || '-'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Tavan Serisi: {profile.ipo.ceilingStreak || 0} Gün • İskonto: {profile.ipo.discountRate || '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ANALYST REPORTS & CONSENSUS */}
          {activeSubTab === 'ANALYST' && (
            <div className="space-y-6">
              {profile.analyst.hasData ? (
                <>
                  {/* Consensus Highlight Box */}
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-bold tracking-wider uppercase mb-2">
                          Kurumsal Araştırma Konsensüsü
                        </span>
                        <div className="flex items-baseline gap-3">
                          <h3 className="text-3xl font-extrabold">{profile.analyst.consensusRecommendation}</h3>
                          <span className="text-white/80 text-sm">
                            (Ortalama Hedef Fiyat: {profile.analyst.avgTargetPrice} {profile.priceData.currency === 'TRY' ? '₺' : '$'})
                          </span>
                        </div>
                        <p className="text-white/80 text-xs mt-2 max-w-xl">
                          İş Yatırım, KAP bildirimleri, Midas ve bağımsız analistlerin raporlarından yapay zeka ile sentezlenmiş ortak piyasa görüşü.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-xl shrink-0">
                        <div className="text-center">
                          <span className="text-2xl font-black font-mono">+{profile.analyst.avgUpsidePct}%</span>
                          <span className="text-[11px] block text-white/75 font-medium mt-0.5">Ortalama Getiri Potansiyeli</span>
                        </div>
                        <div className="h-8 w-px bg-white/20" />
                        <div className="text-center">
                          <span className="text-2xl font-black font-mono">{profile.analyst.reportCount}</span>
                          <span className="text-[11px] block text-white/75 font-medium mt-0.5">Analist Raporu</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Bull Catalysts vs Bear Risks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/20">
                      <div className="bg-white/10 rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 mb-2">
                          <TrendingUp size={14} />
                          Ortak Boğa Argümanları & Katalizörler
                        </h4>
                        <ul className="space-y-1.5 text-xs text-white/90">
                          {profile.analyst.combinedBullArguments.map((arg, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-300 font-bold">•</span>
                              <span>{arg}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white/10 rounded-xl p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5 mb-2">
                          <TrendingDown size={14} />
                          Ortak Ayı Riskleri & Çekinceler
                        </h4>
                        <ul className="space-y-1.5 text-xs text-white/90">
                          {profile.analyst.combinedBearRisks.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-rose-300 font-bold">•</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Individual Analyst Reports List */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Briefcase size={16} className="text-violet-600" />
                      Bu Varlığa Ait Tüm Kurumsal Raporlar ({profile.analyst.reports.length})
                    </h4>

                    <div className="grid grid-cols-1 gap-4">
                      {profile.analyst.reports.map((rep) => (
                        <div key={rep.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 text-xs font-bold rounded-lg">
                                {rep.sourceName}
                              </span>
                              {rep.author && (
                                <span className="text-xs text-neutral-500 font-medium">
                                  Yazar: {rep.author}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400 font-mono">
                              {new Date(rep.publishDate).toLocaleDateString('tr-TR')}
                            </span>
                          </div>

                          <h5 className="text-base font-bold text-neutral-900 dark:text-white">
                            {rep.title}
                          </h5>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Tavsiye: {rep.recommendation || 'BELİRTİLMEDİ'}
                            </span>
                            {rep.targetPrice && (
                              <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                                Hedef Fiyat: {rep.targetPrice} {profile.priceData.currency === 'TRY' ? '₺' : '$'}
                              </span>
                            )}
                            {rep.upsidePct && (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                Prim Potansiyeli: +%{rep.upsidePct}
                              </span>
                            )}
                          </div>

                          {rep.aiSummary && (
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border border-neutral-100 dark:border-neutral-800">
                              <span className="font-bold text-violet-600 dark:text-violet-400 block mb-1">
                                📌 Yapay Zeka Özeti & Sentezi:
                              </span>
                              {rep.aiSummary}
                            </div>
                          )}

                          {rep.sourceUrl && (
                            <div className="pt-2 flex justify-end">
                              <a
                                href={rep.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 flex items-center gap-1"
                              >
                                Orijinal Raporu Gör <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <Target size={36} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                    Bu Varlık İçin Henüz Kayıtlı Analist Raporu Yok
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                    İş Yatırım, KAP ve Midas araştırma servisleri düzenli taranmaktadır. Yeni bir araştırma raporu yayımlandığında otomatik olarak bu varlıkla eşleştirilecektir.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INSTITUTIONAL HOLDINGS & TEFAS FUNDS */}
          {activeSubTab === 'HOLDINGS' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center shrink-0">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      Kurumsal Portföy Payı & Fon Sahipliği Dağılımı
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {profile.institutionalHoldings.summary}
                    </p>
                  </div>
                </div>

                {profile.institutionalHoldings.hasData ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-950/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                          <th className="px-4 py-3">Kurum / Fon Kodu</th>
                          <th className="px-4 py-3">Fon / Varlık Adı</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3 text-right">Portföy Ağırlığı</th>
                          <th className="px-4 py-3 text-center">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {profile.institutionalHoldings.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-violet-600 dark:text-violet-400">
                              {item.code}
                            </td>
                            <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white max-w-xs truncate">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-neutral-500">
                              {item.categoryOrSector || 'Menkul Kıymet'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                              %{item.weightPct.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => loadProfile(item.code)}
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              >
                                Varlığı İncele <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-500">
                    Bu varlık için kayıtlı kurumsal portföy sahipliği bulunamadı.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BUFFETT & DCF VALUATION */}
          {activeSubTab === 'VALUATION' && profile.valuation.hasData && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Award className="text-amber-500" />
                      Warren Buffett Değer Yatırımı & DCF Modeli
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Şirketin indirgenmiş serbest nakit akımları (DCF), sahip kazançları (Owner Earnings) ve 6 temel değerleme kuralı.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-neutral-400 block">Hesaplanan Adil Değer</span>
                      <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {profile.valuation.dcfIntrinsicValue?.toLocaleString('tr-TR')} {profile.priceData.currency === 'TRY' ? '₺' : '$'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 Buffett Rules Matrix */}
                <div className="mt-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Warren Buffett 6 Kural Uygunluk Karnesi
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {profile.valuation.buffettScore?.criteria.map((c, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border transition-all ${
                          c.passed
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-neutral-900 dark:text-white">{c.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {c.passed ? 'UYGUN' : 'UYGUN DEĞİL'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 text-sm font-mono font-extrabold text-neutral-900 dark:text-white">
                          <span>{c.value}</span>
                          <span className="text-xs text-neutral-400 font-normal">(Hedef: {c.target})</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                          {c.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KAP DISCLOSURES */}
          {activeSubTab === 'DISCLOSURES' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" />
                    Kamuyu Aydınlatma Platformu (KAP) Bildirimleri ({profile.disclosures.totalCount})
                  </h3>
                </div>

                {profile.disclosures.hasData ? (
                  <div className="space-y-3">
                    {profile.disclosures.items.map((item) => (
                      <div key={item.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold rounded">
                            {item.category || 'Özel Durum Açıklaması'}
                          </span>
                          <span className="text-neutral-400 font-mono">
                            {item.publishDate ? new Date(item.publishDate).toLocaleString('tr-TR') : '-'}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                          {item.title}
                        </h4>

                        {item.summary && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                            {item.summary}
                          </p>
                        )}

                        {item.url && (
                          <div className="pt-1 flex justify-end">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                            >
                              KAP Resmi Belgesini Aç <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-500">
                    Bu varlık için kayıtlı KAP bildirimi bulunamadı.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: NEWS & SENTIMENT */}
          {activeSubTab === 'NEWS' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Newspaper size={16} className="text-rose-500" />
                    Bu Varlık Hakkında Medya ve Piyasa Haberleri ({profile.news.totalCount})
                  </h3>
                </div>

                {profile.news.hasData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.news.items.map((item) => (
                      <div key={item.id} className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-500">{item.source || 'Piyasa Haberi'}</span>
                          <span className="text-neutral-400 font-mono">
                            {new Date(item.publishedOn).toLocaleDateString('tr-TR')}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                          {item.title}
                        </h4>

                        {item.body && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                            {item.body}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-500">
                    Bu varlık için haber kaydı bulunamadı.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM SECTION: Master Connected Assets Directory (Tüm Varlıklar Rehberi) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Database size={18} className="text-violet-600" />
              Sistemdeki Tüm Çapraz Eşleşmiş Varlıklar Rehberi
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Hisse, fon, kripto ve ETF varlıklarının analist, portföy ve KAP eşleşme karneleri.
            </p>
          </div>

          {/* Market Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/70 p-1 rounded-xl">
            {(['ALL', 'BIST', 'US', 'TEFAS', 'CRYPTO'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  marketFilter === m
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {m === 'ALL' ? 'TÜMÜ' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithAnalyst}
              onChange={(e) => setOnlyWithAnalyst(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">Sadece Analist Raporu Olanlar</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithHoldings}
              onChange={(e) => setOnlyWithHoldings(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">Sadece Fon Portföyünde Olanlar</span>
          </label>
        </div>

        {/* Assets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-950/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-4 py-3">Varlık Kodu</th>
                <th className="px-4 py-3">Adı</th>
                <th className="px-4 py-3">Pazar</th>
                <th className="px-4 py-3 text-right">Fiyat</th>
                <th className="px-4 py-3 text-center">🎯 Analist Konsensüsü</th>
                <th className="px-4 py-3 text-center">🏛️ TEFAS Fon Sahipliği</th>
                <th className="px-4 py-3 text-center">Veri Eşleşme Skoru</th>
                <th className="px-4 py-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {listLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500">
                    <RefreshCw size={20} className="animate-spin text-violet-600 mx-auto mb-2" />
                    Varlık listesi yükleniyor...
                  </td>
                </tr>
              ) : assetList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500">
                    Kriterlere uygun varlık bulunamadı.
                  </td>
                </tr>
              ) : (
                assetList.map((a) => (
                  <tr 
                    key={a.code}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                      selectedTicker === a.code ? 'bg-violet-50/50 dark:bg-violet-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                      {a.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-300 max-w-xs truncate">
                      {a.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {a.market}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {a.price ? `${a.price.toLocaleString('tr-TR')} ${a.currency === 'TRY' ? '₺' : '$'}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.analystReportCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {a.consensusRecommendation || 'AL'} ({a.analystReportCount})
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.fundsHoldingCount > 0 ? (
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {a.fundsHoldingCount} Fon
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-16 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${a.completenessScore}%` }} 
                          />
                        </div>
                        <span className="font-mono text-[10px] text-neutral-500 font-bold">%{a.completenessScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          loadProfile(a.code);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        360° İncele
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
