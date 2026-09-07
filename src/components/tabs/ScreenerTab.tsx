import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface ScreenerItem {
  ticker: string;
  company_name: string;
  sector: string;
  price: number;
  change_pct: number;
  volume: number;
  volume_formatted: string;
  rsi?: number;
  signal?: string;
  pe_ratio?: number;
  sma_50?: number;
  above_sma50?: boolean;
}

interface ScreenerTabProps {
  onOpenTechnical: (ticker: string) => void;
}

export default function ScreenerTab({ onOpenTechnical }: ScreenerTabProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('bullish_momentum');
  const [search, setSearch] = useState<string>('');
  const [items, setItems] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScreener = async (preset: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/market/screener?preset=${preset}`);
      if (!res.ok) throw new Error('Tarama verileri henüz hazır değil');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Screener fetch notice:', err);
      setError(err.message || 'Tarama verileri yüklenirken bağlantı sorunu oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreener(selectedPreset);
  }, [selectedPreset]);

  const filteredResults = items.filter(
    (item) =>
      item.ticker.toLowerCase().includes(search.toLowerCase()) ||
      item.company_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sector.toLowerCase().includes(search.toLowerCase())
  );

  const presetsList = [
    { id: 'bullish_momentum', label: '🚀 Yükseliş Momentumu', desc: 'Fiyat > SMA50 & Artıda' },
    { id: 'oversold', label: '📉 Aşırı Satım', desc: 'RSI < 45 / Düşüşteki Fırsatlar' },
    { id: 'overbought', label: '📈 Aşırı Alım', desc: 'RSI > 60 (Kâr Satışı Bölgesi)' },
    { id: 'macd_bullish', label: '⚡ AL Sinyali Verenler', desc: 'Fiyatı Güçlü Seyredenler' },
    { id: 'high_volume', label: '🔥 Yüksek Hacimliler', desc: 'En Çok İşlem Gören BIST Hisseleri' },
    { id: 'big_gainers', label: '🏆 Günün Kazananları', desc: 'En Çok Yükselen BIST Hisseleri' },
    { id: 'big_losers', label: '⚠️ Günün Kaybedenleri', desc: 'En Çok Düşen BIST Hisseleri' },
  ];

  return (
    <div className="space-y-6">
      {/* Preset Pills Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              BIST Canlı Tarama Stratejileri (Screener Presets)
            </h3>
          </div>
          <button
            onClick={() => fetchScreener(selectedPreset)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {presetsList.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPreset(p.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex flex-col ${
                selectedPreset === p.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              <span>{p.label}</span>
              <span className={`text-[10px] font-normal opacity-80 ${selectedPreset === p.id ? 'text-blue-100' : 'text-neutral-400'}`}>
                {p.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Sonuçlarda ara (Kod, Şirket, Sektör)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs font-mono text-neutral-500">
          Kriteri karşılayan: <strong className="text-neutral-900 dark:text-white">{filteredResults.length}</strong> hisse
        </div>
      </div>

      {/* Screener Results Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3">Sembol</th>
                <th className="px-4 py-3">Şirket Ünvanı</th>
                <th className="px-4 py-3">Sektör</th>
                <th className="px-4 py-3">Son Fiyat</th>
                <th className="px-4 py-3">Değişim (%)</th>
                <th className="px-4 py-3">RSI (14)</th>
                <th className="px-4 py-3">Sinyal</th>
                <th className="px-4 py-3">Hacim</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                    BIST verileri taranıyor...
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                    Bu filtreleme kriterine uyan hisse bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredResults.map((item) => (
                  <tr key={item.ticker} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.ticker}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {item.company_name}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                      {item.sector}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                      ₺{item.price?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      <span
                        className={`flex items-center gap-0.5 ${
                          item.change_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.change_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        %{item.change_pct?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {item.rsi !== undefined && item.rsi !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.rsi < 35
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : item.rsi > 65
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {item.rsi}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.signal?.includes('AL')
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : item.signal?.includes('SAT')
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {item.signal || 'NÖTR'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-500">
                      {item.volume_formatted}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onOpenTechnical(item.ticker)}
                        className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Analiz</span>
                        <ArrowRight size={12} />
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
