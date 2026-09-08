import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, Bot, RefreshCw, Calendar, Tag, ExternalLink, 
  Download, Paperclip, ChevronRight, ChevronDown, ChevronUp, X, Sparkles, AlertCircle, Building2,
  PieChart, FileSpreadsheet, ShieldAlert, Coins, Landmark, CheckCircle2, BarChart3, Lightbulb
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

type CategoryFilter = 'ALL' | 'FINANCIALS' | 'SPECIAL_EVENTS' | 'CAPITAL_DIVIDEND' | 'GOVERNANCE' | 'FUNDS';

/**
 * Beautiful, structured AI Summary formatter for BIST/KAP disclosures
 */
function FormattedAISummary({ text }: { text: string }) {
  if (!text) return null;

  const hasExecutiveSummary = text.includes('Yönetici Özeti') || text.includes('📌');
  const hasFinancialImpact = text.includes('Finansal & Operasyonel Etki') || text.includes('Finansal ve Operasyonel Etki') || text.includes('📊');
  const hasMarketComment = text.includes('Piyasa & Hisse Yorumu') || text.includes('Piyasa ve Hisse Yorumu') || text.includes('Piyasa Yorumu') || text.includes('💡');

  if (hasExecutiveSummary || hasFinancialImpact || hasMarketComment) {
    const sections: { title: string; icon: any; content: string[]; color: string }[] = [];
    const lines = text.split('\n');
    let currentSection: { title: string; icon: any; content: string[]; color: string } | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.includes('Yönetici Özeti') || line.includes('📌')) {
        if (currentSection) sections.push(currentSection);
        const cleanTitle = line.replace(/^[#*\s📌•]+/, '').replace(/[:*#]+$/, '').trim() || 'Yönetici Özeti';
        currentSection = {
          title: cleanTitle,
          icon: FileText,
          content: [],
          color: 'border-blue-200/80 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300'
        };
      } else if (line.includes('Finansal & Operasyonel') || line.includes('Finansal ve Operasyonel') || line.includes('📊')) {
        if (currentSection) sections.push(currentSection);
        const cleanTitle = line.replace(/^[#*\s📊•]+/, '').replace(/[:*#]+$/, '').trim() || 'Finansal & Operasyonel Etki';
        currentSection = {
          title: cleanTitle,
          icon: BarChart3,
          content: [],
          color: 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
        };
      } else if (line.includes('Piyasa & Hisse') || line.includes('Piyasa ve Hisse') || line.includes('Piyasa Yorumu') || line.includes('💡')) {
        if (currentSection) sections.push(currentSection);
        const cleanTitle = line.replace(/^[#*\s💡•]+/, '').replace(/[:*#]+$/, '').trim() || 'Piyasa & Hisse Yorumu';
        currentSection = {
          title: cleanTitle,
          icon: Lightbulb,
          content: [],
          color: 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300'
        };
      } else {
        if (currentSection) {
          currentSection.content.push(line);
        } else {
          currentSection = {
            title: 'Genel Değerlendirme',
            icon: Sparkles,
            content: [line],
            color: 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100'
          };
        }
      }
    }
    if (currentSection) sections.push(currentSection);

    if (sections.length > 0) {
      return (
        <div className="space-y-2.5">
          {sections.map((sec, idx) => {
            const SecIcon = sec.icon;
            return (
              <div key={idx} className={`p-3.5 rounded-xl border ${sec.color} space-y-1.5 transition-all`}>
                <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
                  <SecIcon size={14} className="shrink-0" />
                  <span>{sec.title}</span>
                </div>
                <div className="text-xs text-neutral-850 dark:text-neutral-200 leading-relaxed font-sans space-y-1">
                  {sec.content.map((p, pIdx) => {
                    const isBullet = p.startsWith('*') || p.startsWith('•') || p.startsWith('-');
                    const cleanP = p.replace(/^[*\s•-]+/, '').trim();
                    return (
                      <p key={pIdx} className={isBullet ? "flex items-start gap-2 pl-1" : ""}>
                        {isBullet && <span className="text-neutral-400 mt-1 font-bold">•</span>}
                        <span>{cleanP}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-1.5 whitespace-pre-line">
      {text}
    </div>
  );
}

export default function KapTab({ isDark }: { isDark: boolean }) {
  const [disclosures, setDisclosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const toggleAccordion = (index: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleAllAccordions = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    disclosures.forEach(d => {
      updated[d.disclosureIndex] = expand;
    });
    setOpenAccordions(updated);
  };

  useEffect(() => {
    fetchDisclosures();
  }, []);

  const fetchDisclosures = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/kap/disclosures');
      if (res.ok) {
         const data = await res.json();
         setDisclosures(data);
      }
    } catch (e) {
      console.error("Disclosures fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const triggerKapSync = async () => {
    try {
      setSyncing(true);
      const res = await apiFetch('/api/sync/trigger/KAP', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        showToast(`KAP senkronizasyonu tamamlandı (${data.recordsProcessed || 0} bildirim güncellendi).`, 'success');
        await fetchDisclosures();
      } else {
        showToast(`Senkronizasyon hatası: ${data.error || 'Bilinmeyen hata'}`, 'error');
      }
    } catch (err: any) {
      showToast(`Hata: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSummarizeOnDemand = async (index: string) => {
    try {
      setSummarizingId(index);
      const res = await apiFetch(`/api/kap/summarize/${index}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        showToast('Yapay zeka özeti başarıyla oluşturuldu.', 'success');
        setDisclosures(prev => prev.map(d => d.disclosureIndex === index ? { ...d, summary: data.summary } : d));
        if (selectedItem?.disclosureIndex === index) {
          setSelectedItem((prev: any) => ({ ...prev, summary: data.summary }));
        }
      } else {
        showToast('Özetleme yapılamadı. Lütfen Ayarlar sayfasından API anahtarını veya yerel modeli kontrol edin.', 'error');
      }
    } catch (err: any) {
      showToast(`Özetleme hatası: ${err.message}`, 'error');
    } finally {
      setSummarizingId(null);
    }
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to determine the core category of a disclosure
  const getCategoryGroup = (d: any): CategoryFilter => {
    const cat = (d.category || '').toUpperCase();
    if (cat.includes('FINANCIALS')) return 'FINANCIALS';
    if (cat.includes('SPECIAL_EVENTS') || cat.includes('ODA')) return 'SPECIAL_EVENTS';
    if (cat.includes('CAPITAL_DIVIDEND')) return 'CAPITAL_DIVIDEND';
    if (cat.includes('GOVERNANCE') || cat.includes('GK')) return 'GOVERNANCE';
    if (cat.includes('FUNDS') || cat.includes('FON')) return 'FUNDS';
    return 'SPECIAL_EVENTS';
  };

  const getCategoryBadge = (group: CategoryFilter) => {
    switch (group) {
      case 'FINANCIALS':
        return { label: 'Finansal Tablolar & Raporlar', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', icon: FileSpreadsheet };
      case 'SPECIAL_EVENTS':
        return { label: 'Özel Durum Açıklaması (ÖDA)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800', icon: ShieldAlert };
      case 'CAPITAL_DIVIDEND':
        return { label: 'Sermaye & Temettü', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800', icon: PieChart };
      case 'GOVERNANCE':
        return { label: 'Kurumsal Yönetim & GK', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800', icon: Landmark };
      case 'FUNDS':
        return { label: 'Fon & Menkul Kıymet', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800', icon: Coins };
      default:
        return { label: 'KAP Bildirimi', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700', icon: FileText };
    }
  };

  // Counts for each category filter
  const categoryCounts = disclosures.reduce((acc: Record<string, number>, d) => {
    const group = getCategoryGroup(d);
    acc[group] = (acc[group] || 0) + 1;
    acc['ALL'] = (acc['ALL'] || 0) + 1;
    return acc;
  }, { ALL: 0, FINANCIALS: 0, SPECIAL_EVENTS: 0, CAPITAL_DIVIDEND: 0, GOVERNANCE: 0, FUNDS: 0 });

  const filtered = disclosures.filter((d) => {
    const matchesCategory = selectedCategory === 'ALL' || getCategoryGroup(d) === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (d.symbol || '').toLowerCase().includes(q) || 
      (d.title || '').toLowerCase().includes(q) ||
      (d.fullText || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="text-blue-600 dark:text-blue-400" size={26} />
            KAP Bildirimleri & Yapay Zeka Analizi
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-2xl">
            Kamuyu Aydınlatma Platformu'ndan (KAP) canlı çekilen finansal raporlar, genel kurul kararları, temettü, fon ve özel durum açıklamaları.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={triggerKapSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "KAP'tan Çekiliyor..." : "KAP Verilerini Şimdi Çek"}
          </button>

          <button 
            onClick={fetchDisclosures} 
            disabled={loading}
            className="px-3.5 py-2.5 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
            title="Listeyi Yenile"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <AlertCircle size={18} />
          {toastMessage.text}
        </div>
      )}

      {/* Search & 5-Category Navigation */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Şirket hisse kodu (THYAO, EREGL...), şirket unvanı veya bildirim konusunda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-neutral-900 dark:text-white"
          />
        </div>

        {/* 5 Requested Data Groups Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: 'ALL' as CategoryFilter, label: 'Tüm Bildirimler', count: categoryCounts['ALL'] || 0 },
            { id: 'FINANCIALS' as CategoryFilter, label: '📊 Finansal Tablolar & Raporlar', count: categoryCounts['FINANCIALS'] || 0 },
            { id: 'SPECIAL_EVENTS' as CategoryFilter, label: '🚨 Özel Durum Açıklamaları (ÖDA)', count: categoryCounts['SPECIAL_EVENTS'] || 0 },
            { id: 'CAPITAL_DIVIDEND' as CategoryFilter, label: '📈 Sermaye, Ortaklık & Temettü', count: categoryCounts['CAPITAL_DIVIDEND'] || 0 },
            { id: 'GOVERNANCE' as CategoryFilter, label: '🏛 Kurumsal Yönetim & Genel Kurul', count: categoryCounts['GOVERNANCE'] || 0 },
            { id: 'FUNDS' as CategoryFilter, label: '🪙 Fon ve Menkul Kıymetler', count: categoryCounts['FUNDS'] || 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                selectedCategory === tab.id
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                selectedCategory === tab.id 
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-neutral-900' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Disclosures Feed Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            KAP Bildirim Akışı ({filtered.length})
          </h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
            <Sparkles size={11} />
            {filtered.filter(f => !!f.summary).length} Yapay Zeka Yorumu Hazır
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => toggleAllAccordions(true)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors flex items-center gap-1"
          >
            <ChevronDown size={13} />
            Tüm AI Yorumlarını Aç
          </button>
          <button
            type="button"
            onClick={() => toggleAllAccordions(false)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors flex items-center gap-1"
          >
            <ChevronUp size={13} />
            Kapat
          </button>
        </div>
      </div>

      {/* Disclosures Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-neutral-500 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-blue-500" />
            <p className="text-sm">KAP bildirimleri yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
            <Building2 size={36} className="mx-auto text-neutral-400 opacity-60" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">Bildirim Bulunamadı</h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Seçili filtre veya arama terimine uygun bildirim bulunmuyor. "KAP Verilerini Şimdi Çek" butonuna basarak güncel bildirimleri veritabanına aktarabilirsiniz.
            </p>
          </div>
        ) : (
          filtered.map(d => {
            const group = getCategoryGroup(d);
            const badge = getCategoryBadge(group);
            const Icon = badge.icon;
            const attachments = Array.isArray(d.attachmentUrls) ? d.attachmentUrls : [];
            const isAccordionOpen = !!openAccordions[d.disclosureIndex];

            return (
              <div 
                key={d.id} 
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-700 transition-all hover:shadow-sm space-y-4"
              >
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Symbol badge */}
                    <span className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
                      {d.symbol || 'BIST'}
                    </span>

                    {/* Category badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.color}`}>
                      <Icon size={13} />
                      {badge.label}
                    </span>

                    {/* Date */}
                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 font-mono">
                      <Calendar size={13} />
                      {new Date(d.publishDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {d.url && (
                      <a 
                        href={d.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <span>KAP'ta Aç</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedItem(d)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>İncele</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                    {d.title}
                  </h3>
                </div>

                {/* Interactive AI Analysis Accordion Area */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(d.disclosureIndex)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-50/90 hover:bg-neutral-100 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/60 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${d.summary ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                        <Sparkles size={15} className={summarizingId === d.disclosureIndex ? "animate-spin text-amber-600" : ""} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            Yapay Zeka (AI) Finansal Yorumu ve Analizi
                          </span>
                          {d.summary ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle2 size={10} />
                              AI Analizi Hazır
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                              <Bot size={10} />
                              Yorumu Görmek İçin Tıklayın
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {d.summary 
                            ? 'Şirketin KAP bildiriminin detaylı finansal etki, bilanço ve hisse piyasa yorumunu okumak için tıklayın' 
                            : 'Google Gemini AI motoruyla anlık finansal ve operasyonel etki analizi üretmek için tıklayın'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {isAccordionOpen ? 'Kapat' : 'Yorumu Oku'}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 transition-transform duration-200 ${isAccordionOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isAccordionOpen && (
                    <div className="mt-2.5 p-4 rounded-xl bg-gradient-to-b from-amber-50/30 to-neutral-50/50 dark:from-amber-950/10 dark:to-neutral-900/40 border border-amber-200/70 dark:border-amber-900/40 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                      {d.summary ? (
                        <div className="space-y-3">
                          <FormattedAISummary text={d.summary} />
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-amber-200/50 dark:border-amber-900/40 text-[11px] text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Bot size={13} className="text-amber-600 dark:text-amber-400" />
                              Google Gemini / BIST Finansal Analiz Modeli
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSummarizeOnDemand(d.disclosureIndex);
                              }}
                              disabled={summarizingId === d.disclosureIndex}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-100 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold text-xs transition-colors disabled:opacity-50"
                            >
                              <RefreshCw size={12} className={summarizingId === d.disclosureIndex ? "animate-spin" : ""} />
                              {summarizingId === d.disclosureIndex ? "Yeniden Analiz Ediliyor..." : "Yeniden Analiz Et (AI)"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-3">
                          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                              Yapay Zeka Finansal Analizi Henüz Oluşturulmadı
                            </h4>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mt-1">
                              Bu bildirim metni doğrudan KAP sunucularından alındı. Tek bir tıklamayla finansal yönetici özeti, bilanço ve operasyonel etki ile hisse piyasa yorumunu üretebilirsiniz.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSummarizeOnDemand(d.disclosureIndex)}
                            disabled={summarizingId === d.disclosureIndex}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                          >
                            <Sparkles size={14} className={summarizingId === d.disclosureIndex ? "animate-spin" : ""} />
                            {summarizingId === d.disclosureIndex ? "Analiz Hazırlanıyor..." : "✨ Yapay Zeka ile Şimdi Analiz Et"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                {attachments.length > 0 && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
                      <Paperclip size={13} />
                      Resmi Ekler:
                    </span>
                    {attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-mono border border-neutral-200 dark:border-neutral-700 transition-colors"
                        download
                      >
                        <Download size={12} />
                        <span className="truncate max-w-[200px]">{att.name}</span>
                        <span className="uppercase text-[10px] text-blue-600 dark:text-blue-400 font-bold">.{att.extension}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Full Detail & AI Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
                    {selectedItem.symbol || 'BIST'}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    {new Date(selectedItem.publishDate).toLocaleString('tr-TR')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* AI Summary in Modal */}
              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-600" />
                    Yapay Zeka (AI) Finansal ve Operasyonel Analiz Raporu
                  </span>

                  <button
                    onClick={() => handleSummarizeOnDemand(selectedItem.disclosureIndex)}
                    disabled={summarizingId === selectedItem.disclosureIndex}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={13} className={summarizingId === selectedItem.disclosureIndex ? "animate-spin" : ""} />
                    {selectedItem.summary ? "Tekrar Analiz Et" : "Şimdi Analiz Et"}
                  </button>
                </div>

                {selectedItem.summary ? (
                  <FormattedAISummary text={selectedItem.summary} />
                ) : (
                  <div className="p-4 text-center rounded-xl bg-white/60 dark:bg-neutral-900/60 border border-amber-200/50 dark:border-amber-900/30 space-y-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">
                      Bu bildirim henüz özetlenmedi. "Şimdi Analiz Et" butonuna tıklayarak Google Gemini finansal analiz motoruyla anlık rapor alabilirsiniz.
                    </p>
                  </div>
                )}
              </div>

              {/* Attachments in Modal */}
              {Array.isArray(selectedItem.attachmentUrls) && selectedItem.attachmentUrls.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Ek Belgeler & İndirme Bağlantıları ({selectedItem.attachmentUrls.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedItem.attachmentUrls.map((att: any, i: number) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        download
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={18} className="text-blue-500 shrink-0" />
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{att.name}</span>
                        </div>
                        <Download size={15} className="text-neutral-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Text Content */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Bildirim Metni & Tablo Verileri
                </h4>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-mono leading-relaxed text-neutral-700 dark:text-neutral-300 max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {selectedItem.fullText || "Açıklama metni bulunmamaktadır."}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              {selectedItem.url ? (
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Resmi KAP Sayfasında Görüntüle</span>
                  <ExternalLink size={13} />
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl text-xs font-semibold hover:opacity-90"
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
