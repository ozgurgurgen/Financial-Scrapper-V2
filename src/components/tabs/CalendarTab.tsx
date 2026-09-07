import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, RefreshCw } from 'lucide-react';

interface CalendarEvent {
  id: string;
  country: string;
  flag: string;
  title: string;
  date: string;
  time: string;
  importance: 'high' | 'medium' | 'low';
  actual: string;
  forecast: string;
  previous: string;
  category: string;
  currency: string;
  notes: string;
}

export default function CalendarTab() {
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market/calendar');
      if (!res.ok) throw new Error('Ekonomik takvim alınamadı');
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchCountry = selectedCountry === 'all' || e.country === selectedCountry;
    const matchImp = selectedImportance === 'all' || e.importance === selectedImportance;
    return matchCountry && matchImp;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CalendarIcon size={18} className="text-blue-500" />
              <span>Ekonomik Takvim & Önemli Piyasa Gelişmeleri</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              TCMB, Fed, ECB ve küresel piyasaları etkileyecek kritik makroekonomik veriler
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg">
              Resmi Takvim
            </span>
            <button
              onClick={fetchCalendar}
              disabled={loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-400 font-medium">Ülke:</span>
            {['all', 'TR', 'US', 'EU'].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  selectedCountry === c
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {c === 'all' ? 'Tüm Ülkeler' : c === 'TR' ? '🇹🇷 Türkiye' : c === 'US' ? '🇺🇸 ABD' : '🇪🇺 Euro Bölgesi'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-400 font-medium">Önem:</span>
            {['all', 'high', 'medium'].map((imp) => (
              <button
                key={imp}
                onClick={() => setSelectedImportance(imp)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  selectedImportance === imp
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {imp === 'all'
                  ? 'Tümü'
                  : imp === 'high'
                  ? '🔴 Yüksek'
                  : '🟡 Orta'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Events Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                <th className="px-4 py-3">Tarih & Saat</th>
                <th className="px-4 py-3">Ülke</th>
                <th className="px-4 py-3">Önem</th>
                <th className="px-4 py-3">Ekonomik Gösterge / Olay</th>
                <th className="px-4 py-3">Beklenti</th>
                <th className="px-4 py-3">Önceki</th>
                <th className="px-4 py-3 text-right">Son / Açıklanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    Ekonomik takvim yükleniyor...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    Filtreye uygun etkinlik bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const isHigh = evt.importance === 'high';
                  return (
                    <tr key={evt.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300">
                        <div className="font-semibold text-neutral-900 dark:text-white">{evt.date}</div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          <span>{evt.time}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <span>{evt.flag}</span>
                          <span className="font-mono">{evt.country}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isHigh
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {isHigh ? 'YÜKSEK' : 'ORTA'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                        <div>{evt.title}</div>
                        <div className="text-[11px] text-neutral-400 font-normal">{evt.notes}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-600 dark:text-neutral-300">
                        {evt.forecast || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-400">
                        {evt.previous || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-right font-bold text-neutral-900 dark:text-white">
                        {evt.actual ? (
                          <span className="text-emerald-600 dark:text-emerald-400">{evt.actual}</span>
                        ) : (
                          <span className="text-neutral-400 font-normal italic">Bekleniyor</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
