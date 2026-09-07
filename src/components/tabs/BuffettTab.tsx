import { useState, useEffect } from 'react';
import { 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ChevronDown, 
  ChevronUp,
  RefreshCw
} from 'lucide-react';

interface BuffettItem {
  ticker: string;
  company_name: string;
  sector: string;
  score: number;
  rating: string;
  margin_of_safety: number;
  roe: number;
  pe: number;
  pb: number;
  debt_to_equity: number;
  criteria: {
    id: string;
    title: string;
    value: string;
    target: string;
    passed: boolean;
    desc: string;
  }[];
}

export default function BuffettTab() {
  const [minScoreFilter, setMinScoreFilter] = useState<number>(60);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [items, setItems] = useState<BuffettItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuffett = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market/buffett');
      if (!res.ok) throw new Error('Buffett değerleme verileri alınamadı');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuffett();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.ticker.toLowerCase().includes(search.toLowerCase()) ||
      item.company_name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && item.score >= minScoreFilter;
  });

  return (
    <div className="space-y-6">
      {/* Intro Header & Strategy Philosophy */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-amber-500/20">
              <Award size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Warren Buffett Değer Yatırımı Puanlama Motoru
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                BIST şirketlerinin finansal tabloları üzerinden otomatik hesaplanan 6 temel Buffett kriteri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMinScoreFilter(60)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                minScoreFilter === 60
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              Tümü (&gt;60 Puan)
            </button>
            <button
              onClick={() => setMinScoreFilter(80)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                minScoreFilter === 80
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              Yüksek Değer (&gt;80 Puan)
            </button>
            <button
              onClick={fetchBuffett}
              disabled={loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div>
            <span className="text-neutral-400">Taranan Şirket:</span>
            <div className="text-lg font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
              {items.length} BIST Şirketi
            </div>
          </div>
          <div>
            <span className="text-neutral-400">Kriterleri Karşılayan:</span>
            <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {filteredItems.length} Şirket
            </div>
          </div>
          <div>
            <span className="text-neutral-400">Ortalama ROE:</span>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              %{items.length > 0 ? (items.reduce((acc, i) => acc + i.roe, 0) / items.length).toFixed(1) : '0.0'}
            </div>
          </div>
          <div>
            <span className="text-neutral-400">Ortalama F/K:</span>
            <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {items.length > 0 ? (items.reduce((acc, i) => acc + i.pe, 0) / items.length).toFixed(1) : '0.0'}x
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buffett listesinde şirket ara (THYAO, BIMAS, EREGL)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Buffett Scorecards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            BIST finansal verileri ve bilanço rasyoları analiz ediliyor...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Belirtilen kriterlere uygun hisse bulunamadı.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedTicker === item.ticker;
            return (
              <div
                key={item.ticker}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm transition-all"
              >
                {/* Main Summary Row */}
                <div
                  onClick={() => setExpandedTicker(isExpanded ? null : item.ticker)}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                >
                  <div className="flex items-center gap-4">
                    {/* Score Pill */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex flex-col items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
                      <span className="text-xl leading-none">{item.score}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">/ 100</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                          {item.ticker}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                          {item.company_name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {item.rating}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-neutral-400 mt-1 font-mono">
                        <span>Sektör: <strong className="text-neutral-800 dark:text-neutral-200">{item.sector}</strong></span>
                        <span>Güvenlik Marjı: <strong className="text-blue-600 dark:text-blue-400">+%{item.margin_of_safety}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Summary Strip */}
                  <div className="flex items-center gap-6 text-xs font-mono border-t lg:border-t-0 pt-3 lg:pt-0 border-neutral-100 dark:border-neutral-800">
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 font-sans uppercase">ROE</div>
                      <div className="font-bold text-emerald-600 text-sm">%{item.roe}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 font-sans uppercase">Borç/Özkaynak</div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{item.debt_to_equity}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 font-sans uppercase">F/K</div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{item.pe}x</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400 font-sans uppercase">PD/DD</div>
                      <div className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">{item.pb}x</div>
                    </div>
                    <div className="text-neutral-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Breakdown Accordion */}
                {isExpanded && (
                  <div className="p-5 bg-neutral-50/50 dark:bg-neutral-800/30 border-t border-neutral-100 dark:border-neutral-800 space-y-4 text-xs">
                    <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                      6 Temel Kriter Puanlama Raporu
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {item.criteria.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-neutral-900 dark:text-white">{c.title}</div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">{c.desc}</div>
                            <div className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 mt-1">
                              Değer: <strong>{c.value}</strong> (Hedef: {c.target})
                            </div>
                          </div>

                          {c.passed ? (
                            <div className="text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-1 rounded-full shrink-0">
                              <CheckCircle2 size={16} />
                            </div>
                          ) : (
                            <div className="text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-1 rounded-full shrink-0">
                              <AlertCircle size={16} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-2">
                      <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                      <span>
                        <strong>Graham &amp; Buffett Değerleme Modeli:</strong> Şirket mali verileri ve kârlılık rasyolarına göre hesaplanan puan: {item.score}/100. Tahmini güvenlik marjı %{item.margin_of_safety}.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
