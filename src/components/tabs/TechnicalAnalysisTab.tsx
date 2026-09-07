import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  Layers,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart as RechartsLine, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

interface TechnicalAnalysisTabProps {
  isDark: boolean;
}

export default function TechnicalAnalysisTab({ isDark }: TechnicalAnalysisTabProps) {
  const [ticker, setTicker] = useState<string>('THYAO');
  const [period, setPeriod] = useState<string>('3A');
  const [inputTicker, setInputTicker] = useState<string>('THYAO');
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async (sym: string, per: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/market/technical/${encodeURIComponent(sym)}?period=${per}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `${sym} için teknik veri alınamadı`);
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Teknik analiz yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(ticker, period);
  }, [ticker, period]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const upper = inputTicker.trim().toUpperCase();
    if (upper) {
      setTicker(upper);
    }
  };

  // Build chart dataset
  const chartData = analysis?.chart_data?.dates?.map((date: string, idx: number) => ({
    date,
    close: analysis.chart_data.closes[idx],
    upper: analysis.chart_data.upper_band[idx],
    lower: analysis.chart_data.lower_band[idx],
    sma20: analysis.chart_data.sma20[idx],
    rsi: analysis.chart_data.rsi_vals?.[idx] ?? 50,
    macd: analysis.chart_data.macd_vals?.[idx] ?? 0,
    signal: analysis.chart_data.signal_vals?.[idx] ?? 0,
  })) || [];

  const isSignalBuy = analysis?.verdict?.includes('AL');

  return (
    <div className="space-y-6">
      {/* Top Search & Period Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="BIST Hisse Kodu (örn: THYAO, ASELS, GARAN)..."
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : null}
            <span>Analiz Et</span>
          </button>
        </form>

        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg text-xs">
          {['1A', '3A', '6A', '1Y', '3Y', '5Y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded font-medium transition-all cursor-pointer ${
                period === p
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {p === '5Y' ? '5 Yıl (5Y)' : p === '3Y' ? '3 Yıl' : p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {analysis && (
        <>
          {/* General Signal Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              isSignalBuy
                ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300 dark:border-emerald-800/60'
                : 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-300 dark:border-rose-800/60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                  isSignalBuy ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
                }`}
              >
                <Zap size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black font-mono tracking-tight text-neutral-900 dark:text-white">
                    {analysis.ticker}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">
                    {analysis.company_name}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-black tracking-wide ${
                      isSignalBuy
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                    }`}
                  >
                    {analysis.verdict}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Gerçek Piyasa Verisi: RSI (14), MACD, SMA 20 ve Bollinger Bantları
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-extrabold text-neutral-900 dark:text-white font-mono">
                ₺{analysis.current_price?.toFixed(2)}
              </div>
              <div
                className={`text-xs font-mono font-semibold flex items-center justify-end gap-0.5 ${
                  analysis.price_change_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {analysis.price_change_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                %{analysis.price_change_pct?.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Indicator Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <IndicatorCard
              title="RSI (14)"
              value={analysis.rsi_14?.toFixed(1) || '-'}
              sub={analysis.rsi_14 > 70 ? 'Aşırı Alım' : analysis.rsi_14 < 30 ? 'Aşırı Satım' : 'Dengeli Bölge'}
              color="text-blue-600 dark:text-blue-400"
            />
            <IndicatorCard
              title="MACD (12, 26)"
              value={analysis.macd?.toFixed(2) || '-'}
              sub={analysis.macd > 0 ? 'Pozitif Momentum' : 'Negatif Bölge'}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <IndicatorCard
              title="SMA 20"
              value={`₺${analysis.sma_20?.toFixed(2) || '-'}`}
              sub="20 Günlük Ortalama"
              color="text-neutral-800 dark:text-neutral-200"
            />
            <IndicatorCard
              title="Bollinger Üst"
              value={`₺${analysis.bollinger_upper?.toFixed(2) || '-'}`}
              sub="+2 Std Sapma"
              color="text-purple-600 dark:text-purple-400"
            />
            <IndicatorCard
              title="Destek Seviyesi"
              value={`₺${analysis.support_level?.toFixed(2) || '-'}`}
              sub="Yerel Dip"
              color="text-emerald-600 dark:text-emerald-400"
            />
            <IndicatorCard
              title="Direnç Seviyesi"
              value={`₺${analysis.resistance_level?.toFixed(2) || '-'}`}
              sub="Yerel Zirve"
              color="text-rose-600 dark:text-rose-400"
            />
          </div>

          {/* Price + Bollinger Band Chart */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <LineChart size={16} className="text-blue-500" />
                <span>Canlı Kapanış Fiyatı & Bollinger Bantları (Upper, Lower & SMA 20)</span>
              </h4>
              <span className="text-[11px] text-neutral-400 font-mono">BIST Canlı Eşzamanlı</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                  <XAxis dataKey="date" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={10} />
                  <YAxis stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={10} domain={['auto', 'auto']} tickFormatter={(v) => `₺${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#171717' : '#ffffff',
                      borderColor: isDark ? '#262626' : '#e5e5e5',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                    }}
                  />
                  <Line type="monotone" dataKey="upper" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Üst Bant" />
                  <Line type="monotone" dataKey="lower" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Alt Bant" />
                  <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="SMA 20" />
                  <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} name="Kapanış Fiyatı" />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RSI & MACD Dual Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RSI Chart */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">RSI (Relative Strength Index - 14)</span>
                <span className="text-[11px] font-mono text-blue-600 font-bold">{analysis.rsi_14?.toFixed(1)}</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLine data={chartData}>
                    <CartesianGrid strokeDasharray="2 2" stroke={isDark ? '#262626' : '#e5e5e5'} />
                    <XAxis dataKey="date" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={9} />
                    <YAxis domain={[0, 100]} stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={9} ticks={[30, 50, 70]} />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="rsi" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </RechartsLine>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MACD Chart */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">MACD & Sinyal Çizgisi</span>
                <span className="text-[11px] font-mono text-emerald-600 font-bold">{analysis.macd?.toFixed(2)}</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLine data={chartData}>
                    <CartesianGrid strokeDasharray="2 2" stroke={isDark ? '#262626' : '#e5e5e5'} />
                    <XAxis dataKey="date" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={9} />
                    <YAxis stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={9} domain={['auto', 'auto']} />
                    <Line type="monotone" dataKey="macd" stroke="#10b981" strokeWidth={2} dot={false} name="MACD" />
                    <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Sinyal" />
                  </RechartsLine>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IndicatorCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 shadow-xs flex flex-col justify-between">
      <span className="text-[10px] text-neutral-400 uppercase font-semibold">{title}</span>
      <div className={`text-sm font-bold font-mono my-1 ${color}`}>{value}</div>
      <span className="text-[10px] text-neutral-500 truncate" title={sub}>{sub}</span>
    </div>
  );
}
