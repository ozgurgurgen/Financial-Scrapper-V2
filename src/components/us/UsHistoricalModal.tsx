import React, { useState, useEffect } from 'react';
import { 
  X, TrendingUp, TrendingDown, Calendar, ShieldCheck, 
  BarChart3, Activity, ArrowUpRight, DollarSign, RefreshCw 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid 
} from 'recharts';

export interface UsHistoricalModalProps {
  ticker: string;
  assetType: 'STOCK' | 'ETF';
  name?: string;
  onClose: () => void;
}

export interface Historical5YData {
  ticker: string;
  assetType: 'STOCK' | 'ETF';
  currency: 'USD';
  currentPrice: number;
  periodStartPrice: number;
  fiveYearReturnPct: number;
  cagr5yPct: number;
  threeYearReturnPct: number;
  oneYearReturnPct: number;
  sixMonthReturnPct: number;
  oneMonthReturnPct: number;
  allTimeHigh5y: number;
  allTimeLow5y: number;
  maxDrawdown5y: number;
  historicalVolatility: number;
  sp500ComparisonDiff: number;
  candles: Array<{
    date: string;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    peRatio?: number;
    dividendYield?: number;
  }>;
}

export const UsHistoricalModal: React.FC<UsHistoricalModalProps> = ({
  ticker,
  assetType,
  name,
  onClose
}) => {
  const [data, setData] = useState<Historical5YData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<'1M' | '6M' | '1Y' | '3Y' | '5Y'>('5Y');

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/us-history/${assetType.toLowerCase()}/${ticker}`);
        if (!res.ok) throw new Error('5 Yıllık geçmiş veri alınamadı');
        const json = await res.json();
        if (isMounted) {
          setData(json.history);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Hata oluştu');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [ticker, assetType]);

  // Filter chart points based on selected range
  const chartPoints = (data?.candles || []).slice(
    selectedRange === '1M' ? -2 :
    selectedRange === '6M' ? -6 :
    selectedRange === '1Y' ? -12 :
    selectedRange === '3Y' ? -36 : 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        id="us-historical-modal" 
        className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
              {assetType === 'ETF' ? '🌐' : '🗽'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono text-neutral-900 dark:text-white">
                  {ticker}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {assetType === 'ETF' ? 'Borsa Yatırım Fonu (ETF)' : 'Amerikan Borsası Hissesi'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  USD ($) BAZINDA
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {name || `${ticker} 5 Yıllık OHLCV Derin Geçmiş & Performans Analizi (2021-2026)`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-3">
              <RefreshCw size={28} className="animate-spin text-blue-500" />
              <p className="text-xs font-medium">5 Yıllık derin mum ve volatilite verisi yükleniyor...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* 5Y Returns KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-medium">5 Yıllık Getiri</span>
                  <div className={`text-xl font-extrabold font-mono mt-1 flex items-center gap-1 ${
                    data.fiveYearReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {data.fiveYearReturnPct >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    <span>%{data.fiveYearReturnPct.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
                    Yıllık Bileşik (CAGR): %{data.cagr5yPct.toFixed(1)}
                  </span>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-medium">S&P 500 Alfa / Fark</span>
                  <div className={`text-xl font-extrabold font-mono mt-1 ${
                    data.sp500ComparisonDiff >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {data.sp500ComparisonDiff >= 0 ? '+' : ''}%{data.sp500ComparisonDiff.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    {data.sp500ComparisonDiff >= 0 ? 'Endeksi yendi 🏆' : 'Endeksin gerisinde'}
                  </span>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-medium">5Y Max Düşüş (Drawdown)</span>
                  <div className="text-xl font-extrabold font-mono mt-1 text-rose-600 dark:text-rose-400">
                    -%{data.maxDrawdown5y.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">
                    5Y Volatilite: %{data.historicalVolatility.toFixed(1)}
                  </span>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-medium">5 Yıllık Fiyat Aralığı</span>
                  <div className="text-sm font-bold font-mono mt-1 text-neutral-900 dark:text-white">
                    ${data.allTimeLow5y} - ${data.allTimeHigh5y}
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block font-semibold">
                    Güncel: ${data.currentPrice}
                  </span>
                </div>
              </div>

              {/* Chart Controls & Recharts Visualizer */}
              <div className="bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      5 Yıllık Fiyat Gelişimi (USD)
                    </span>
                  </div>

                  {/* Range Buttons */}
                  <div className="flex items-center gap-1 bg-neutral-200/70 dark:bg-neutral-800 p-1 rounded-lg">
                    {(['1M', '6M', '1Y', '3Y', '5Y'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRange(r)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                          selectedRange === r
                            ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Area Chart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: '#888' }} 
                        tickLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10, fill: '#888' }} 
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#171717', 
                          border: '1px solid #333', 
                          borderRadius: '8px', 
                          color: '#fff',
                          fontSize: '11px' 
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Kapanış']}
                        labelFormatter={(label) => `Tarih: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorClose)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Performance Multi-Horizon Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400 block">1 Aylık Değişim</span>
                  <span className={`text-sm font-bold font-mono mt-0.5 block ${data.oneMonthReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {data.oneMonthReturnPct >= 0 ? '+' : ''}%{data.oneMonthReturnPct}
                  </span>
                </div>
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400 block">6 Aylık Değişim</span>
                  <span className={`text-sm font-bold font-mono mt-0.5 block ${data.sixMonthReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {data.sixMonthReturnPct >= 0 ? '+' : ''}%{data.sixMonthReturnPct}
                  </span>
                </div>
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400 block">1 Yıllık Değişim</span>
                  <span className={`text-sm font-bold font-mono mt-0.5 block ${data.oneYearReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {data.oneYearReturnPct >= 0 ? '+' : ''}%{data.oneYearReturnPct}
                  </span>
                </div>
                <div className="p-3 bg-neutral-100 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400 block">3 Yıllık Değişim</span>
                  <span className={`text-sm font-bold font-mono mt-0.5 block ${data.threeYearReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {data.threeYearReturnPct >= 0 ? '+' : ''}%{data.threeYearReturnPct}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
