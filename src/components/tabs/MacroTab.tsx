import React, { useState, useEffect } from 'react';
import { 
  Building, TrendingUp, TrendingDown, Percent, DollarSign, Calendar, 
  ShieldCheck, PieChart, Globe2, RefreshCw, Database
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend 
} from 'recharts';
import { apiFetch } from '../../lib/api';

interface MacroIndicator {
  id: number;
  code: string;
  name: string;
  source: string;
  value: string;
  unit: string;
  datePeriod: string;
  lastUpdated: string;
}

interface MacroTabProps {
  isDark: boolean;
}

export default function MacroTab({ isDark }: MacroTabProps) {
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 12-month Macro Time Series Data for inflation, policy rate, and usd/try (Static for chart representation)
  const macroHistory = [
    { month: '2024-04', tufe: 69.8, faiz: 50.0, usdtry: 32.4 },
    { month: '2024-05', tufe: 75.4, faiz: 50.0, usdtry: 32.2 },
    { month: '2024-06', tufe: 71.6, faiz: 50.0, usdtry: 32.8 },
    { month: '2024-07', tufe: 61.8, faiz: 50.0, usdtry: 33.1 },
    { month: '2024-08', tufe: 51.9, faiz: 50.0, usdtry: 34.0 },
    { month: '2024-09', tufe: 49.4, faiz: 50.0, usdtry: 34.2 },
    { month: '2024-10', tufe: 48.6, faiz: 50.0, usdtry: 34.3 },
    { month: '2024-11', tufe: 47.1, faiz: 50.0, usdtry: 34.6 },
    { month: '2024-12', tufe: 44.4, faiz: 47.5, usdtry: 35.3 },
    { month: '2025-01', tufe: 42.1, faiz: 45.0, usdtry: 35.8 },
    { month: '2025-02', tufe: 39.5, faiz: 45.0, usdtry: 36.2 },
    { month: '2025-03', tufe: 38.2, faiz: 42.5, usdtry: 36.4 },
  ];

  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/macro');
      if (!res.ok) throw new Error('Makro veriler çekilemedi.');
      const data = await res.json();
      setIndicators(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const res = await apiFetch('/api/macro/sync', { 
        method: 'POST'
      });
      if (!res.ok) throw new Error('Veri senkronizasyonu başarısız.');
      const data = await res.json();
      
      if (data.missingKeys?.evds || data.missingKeys?.fred) {
         setError('Bazı API anahtarları eksik (.env.example dosyasına ekleyin). Kısmi senkronizasyon yapıldı.');
      }

      await fetchIndicators();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Overview Banner */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
              <Globe2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                TCMB EVDS & FRED Makro Verileri (Cloud SQL)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Merkez Bankası ve Federal Reserve API entegrasyonları ile canlı veritabanı yansıması
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <Database size={14} />
              <span>Veritabanı Kayıtları: {indicators.length}</span>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Çekiliyor...' : 'EVDS & FRED Senkronize Et'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* DB Sync Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
             <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Database size={16} className="text-blue-500" />
                <span>Gerçek Zamanlı Göstergeler (DB)</span>
             </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500">
                  <th className="px-4 py-3">Gösterge</th>
                  <th className="px-4 py-3 text-center">Kaynak</th>
                  <th className="px-4 py-3 text-right">Son Değer</th>
                  <th className="px-4 py-3 text-right">Dönem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-500">Veriler Yükleniyor...</td>
                  </tr>
                ) : indicators.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-500">Veritabanında kayıtlı makro veri bulunamadı. Senkronize ediniz.</td>
                  </tr>
                ) : (
                  indicators.map((ind) => (
                    <tr key={ind.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                        <div className="flex flex-col">
                          <span>{ind.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono mt-0.5">{ind.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ind.source === 'EVDS' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {ind.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        {parseFloat(ind.value).toFixed(2)} {ind.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-500">
                        {ind.datePeriod}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Macro Chart: TÜFE vs TCMB Faizi vs USD/TRY */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <span>Türkiye Makro Trendleri (Referans Geçmiş)</span>
            </h4>
            <span className="text-[11px] text-neutral-400 font-mono">% Yıllık</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macroHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                <XAxis dataKey="month" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={10} />
                <YAxis stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={10} domain={[30, 80]} tickFormatter={(v) => `%${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#171717' : '#ffffff',
                    borderColor: isDark ? '#262626' : '#e5e5e5',
                    borderRadius: '0.5rem',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="tufe" stroke="#ef4444" strokeWidth={2.5} name="Yıllık TÜFE (%)" />
                <Line type="monotone" dataKey="faiz" stroke="#3b82f6" strokeWidth={2.5} name="Politika Faizi (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
