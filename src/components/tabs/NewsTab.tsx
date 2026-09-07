import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Newspaper, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Filter, 
  Clock, 
  Globe, 
  Building2, 
  Coins, 
  Calendar, 
  X,
  Share2,
  Check,
  Sliders
} from 'lucide-react';
import { NewsCategory, NewsItem, NewsSummaryData } from '../../types';

const CATEGORY_TABS: { id: NewsCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'ALL', label: 'Tüm Haberler', icon: <Newspaper size={15} />, color: 'blue' },
  { id: 'BIST', label: 'Borsa İstanbul & Şirketler', icon: <Building2 size={15} />, color: 'indigo' },
  { id: 'EKONOMI', label: 'Makroekonomi & TCMB', icon: <TrendingUp size={15} />, color: 'emerald' },
  { id: 'GLOBAL', label: 'Küresel Piyasalar & FED', icon: <Globe size={15} />, color: 'sky' },
  { id: 'KRIPTO', label: 'Kripto & On-Chain', icon: <Coins size={15} />, color: 'amber' },
  { id: 'HALKA_ARZ', label: 'Halka Arz & SPK', icon: <Calendar size={15} />, color: 'purple' },
];

function sanitizeNewsLink(url?: string | null, symbolOrCode?: string): string {
  if (!url || url === '#' || url.trim() === '' || url === 'https://www.kap.org.tr/tr/bist-sirketler') {
    if (symbolOrCode && symbolOrCode.length >= 2) {
      return `/api/kap/company-redirect/${encodeURIComponent(symbolOrCode.toUpperCase().trim())}`;
    }
    return 'https://halkarz.com/';
  }
  let clean = url.trim();
  if (clean.includes('kap.org.tr/tr/sirketler/detay/')) {
    const parts = clean.split('kap.org.tr/tr/sirketler/detay/');
    if (parts[1]) {
      return `/api/kap/company-redirect/${encodeURIComponent(parts[1].trim())}`;
    }
    clean = clean.replace('kap.org.tr/tr/sirketler/detay/', 'kap.org.tr/tr/sirket-bilgileri/ozet/');
  }
  // If URL has /ozet/ with just ticker and no memberId slug (e.g. /ozet/SARAE, /ozet/BEWEN), redirect via API
  const ozetMatch = clean.match(/kap\.org\.tr\/tr\/sirket-bilgileri\/ozet\/([A-Za-z0-9]+)$/);
  if (ozetMatch && ozetMatch[1]) {
    return `/api/kap/company-redirect/${encodeURIComponent(ozetMatch[1])}`;
  }
  if (clean.includes('kap.org.tr/tr/bildirim/')) {
    clean = clean.replace('kap.org.tr/tr/bildirim/', 'kap.org.tr/tr/Bildirim/');
  }
  if (clean.includes('spk.gov.tr/bultenler') || clean.includes('spk.gov.tr/kurumsal/bultenler')) {
    clean = 'https://spk.gov.tr/bulten';
  }
  return clean;
}

export default function NewsTab() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [summary, setSummary] = useState<NewsSummaryData | null>(null);
  const [newsSettings, setNewsSettings] = useState<{ maxTotalNews?: number; categories?: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState<'ALL' | 'POZİTİF' | 'NÖTR' | 'NEGATİF'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticleModal, setActiveArticleModal] = useState<NewsItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchNews = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get('/api/news', {
        params: {
          category: activeCategory,
          sentiment: selectedSentiment,
          search: searchQuery,
          limit: 120,
          force: force ? 'true' : 'false',
        },
      });

      if (response.data && response.data.success) {
        setNews(response.data.items || []);
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
        if (response.data.settings) {
          setNewsSettings(response.data.settings);
        }
      }
    } catch (error) {
      console.error('Haberler çekilirken hata oluştu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(false);
  }, [activeCategory, selectedSentiment]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchNews(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleManualRefresh = () => {
    fetchNews(true);
  };

  const handleCopyLink = (item: NewsItem) => {
    if (navigator.clipboard) {
      const validUrl = sanitizeNewsLink(item.url, item.companyCode);
      navigator.clipboard.writeText(validUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 2) return 'Az önce';
      if (diffMin < 60) return `${diffMin} dakika önce`;
      if (diffHour < 24) return `${diffHour} saat önce`;
      if (diffDay < 7) return `${diffDay} gün önce`;
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadgeClass = (cat: NewsCategory) => {
    switch (cat) {
      case 'BIST':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'EKONOMI':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'GLOBAL':
        return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'KRIPTO':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'HALKA_ARZ':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700';
    }
  };

  const getCategoryLabel = (cat: NewsCategory) => {
    switch (cat) {
      case 'BIST': return 'Borsa İstanbul';
      case 'EKONOMI': return 'Makroekonomi';
      case 'GLOBAL': return 'Küresel Piyasa';
      case 'KRIPTO': return 'Kripto Para';
      case 'HALKA_ARZ': return 'Halka Arz';
      default: return 'Finans';
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Newspaper size={22} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Piyasa & Finans Haberleri
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> CANLI AKIŞ
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-2xl">
            Borsa İstanbul, TCMB ekonomi politikaları, küresel borsalar, SPK halka arzları ve kripto piyasalarından anlık haberler; yapay zeka duyarlılık analiziyle kategorize edilmiştir.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {newsSettings && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/60" title="Ayarlardan değiştirilebilir haber limiti">
              <Sliders size={13} className="text-blue-500" />
              <span className="text-neutral-400">Limit:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {activeCategory === 'ALL' 
                  ? `${newsSettings.maxTotalNews || 50} adet`
                  : `${newsSettings.categories?.[activeCategory] || newsSettings.maxTotalNews || 50} adet`}
              </span>
            </div>
          )}

          {summary && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-300">
              <span className="text-neutral-400">Duyarlılık:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">%{summary.positiveRatioPct} Pozitif</span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="font-mono text-neutral-500">{summary.total} Haber</span>
            </div>
          )}

          <button
            id="btn-news-refresh"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Taranıyor...' : 'Haberleri Yenile'}</span>
          </button>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab.id;
          let count = 0;
          if (summary?.categoryCounts) {
            if (tab.id === 'ALL') count = summary.categoryCounts.all;
            else if (tab.id === 'BIST') count = summary.categoryCounts.bist;
            else if (tab.id === 'EKONOMI') count = summary.categoryCounts.ekonomi;
            else if (tab.id === 'GLOBAL') count = summary.categoryCounts.global;
            else if (tab.id === 'KRIPTO') count = summary.categoryCounts.crypto;
            else if (tab.id === 'HALKA_ARZ') count = summary.categoryCounts.halka_arz;
          }

          return (
            <button
              key={tab.id}
              id={`news-cat-${tab.id.toLowerCase()}`}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <span className={isActive ? 'text-inherit' : 'text-neutral-500 dark:text-neutral-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive
                      ? 'bg-neutral-700 text-white dark:bg-neutral-200 dark:text-neutral-900'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            id="news-search-input"
            type="text"
            placeholder="Haber başlığı, şirket veya anahtar kelime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sentiment Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-neutral-400 flex items-center gap-1 mr-1 shrink-0">
            <Filter size={13} /> Duyarlılık:
          </span>
          {(['ALL', 'POZİTİF', 'NÖTR', 'NEGATİF'] as const).map((sent) => {
            const isActive = selectedSentiment === sent;
            let icon = null;
            if (sent === 'POZİTİF') icon = <TrendingUp size={13} className="text-emerald-500" />;
            else if (sent === 'NEGATİF') icon = <TrendingDown size={13} className="text-rose-500" />;
            else if (sent === 'NÖTR') icon = <Minus size={13} className="text-neutral-400" />;

            return (
              <button
                key={sent}
                id={`sentiment-filter-${sent.toLowerCase()}`}
                onClick={() => setSelectedSentiment(sent)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                {icon}
                <span>{sent === 'ALL' ? 'Tümü' : sent}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* News Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
              </div>
              <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
              <div className="h-12 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded-md"></div>
              <div className="flex items-center justify-between pt-2">
                <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
                <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
            <Newspaper size={24} />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Haber Bulunamadı
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            Seçili kategori veya arama kriterine uygun haber bulunamadı. Filtreleri temizleyebilir veya 'Haberleri Yenile' butonuna basabilirsiniz.
          </p>
          <button
            onClick={() => {
              setActiveCategory('ALL');
              setSelectedSentiment('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Filtreleri Sıfırla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.map((item) => {
            const sentimentBadge =
              item.sentiment === 'POZİTİF' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <TrendingUp size={11} /> Pozitif
                </span>
              ) : item.sentiment === 'NEGATİF' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <TrendingDown size={11} /> Negatif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  <Minus size={11} /> Nötr
                </span>
              );

            return (
              <article
                key={item.id}
                id={`news-card-${item.id}`}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xs group"
              >
                <div className="space-y-3">
                  {/* Category & Source Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {getCategoryLabel(item.category)}
                    </span>
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-medium">
                      <Clock size={12} />
                      <span>{formatRelativeTime(item.publishedOn)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setActiveArticleModal(item)}
                    className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 cursor-pointer leading-snug"
                    title={item.title}
                  >
                    {item.title}
                  </h3>

                  {/* Excerpt / Summary */}
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                    {item.body || 'Haber detayı için tıklayınız.'}
                  </p>
                </div>

                {/* Footer Controls & Metadata */}
                <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {sentimentBadge}
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium truncate max-w-[120px]">
                      {item.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(item)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Haberi Paylaş / Linki Kopyala"
                    >
                      {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                    </button>

                    <a
                      href={sanitizeNewsLink(item.url, item.companyCode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      title="Kaynağa Git"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Article Detail Modal */}
      {activeArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeClass(
                    activeArticleModal.category
                  )}`}
                >
                  {getCategoryLabel(activeArticleModal.category)}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {activeArticleModal.source}
                </span>
              </div>

              <button
                onClick={() => setActiveArticleModal(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                {activeArticleModal.title}
              </h2>

              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {new Date(activeArticleModal.publishedOn).toLocaleString('tr-TR')}
                </span>
                <span>•</span>
                <span>Duyarlılık: <strong>{activeArticleModal.sentiment}</strong></span>
              </div>

              <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line space-y-3">
                <p>{activeArticleModal.body}</p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  AI Değerlendirmesi
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Bu haber içeriği, finansal analiz modelimiz tarafından taranarak{' '}
                  <strong className={
                    activeArticleModal.sentiment === 'POZİTİF' ? 'text-emerald-600 dark:text-emerald-400' :
                    activeArticleModal.sentiment === 'NEGATİF' ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-600 dark:text-neutral-300'
                  }>
                    {activeArticleModal.sentiment}
                  </strong>{' '}
                  duyarlılık puanıyla işaretlenmiştir. Piyasa etkileri sektörel bazda takip edilmelidir.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between">
              <button
                onClick={() => handleCopyLink(activeArticleModal)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                {copiedId === activeArticleModal.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                <span>{copiedId === activeArticleModal.id ? 'Bağlantı Kopyalandı' : 'Linki Kopyala'}</span>
              </button>

              <a
                href={sanitizeNewsLink(activeArticleModal.url, activeArticleModal.companyCode)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/20 transition-all"
              >
                <span>Orijinal Kaynağı Aç</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
