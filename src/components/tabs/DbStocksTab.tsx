import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Database, DollarSign, TrendingUp, TrendingDown, 
  Search, BarChart2, Layers, Filter, CheckCircle2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface Stock {
  id: number;
  ticker: string;
  companyName: string;
  price: string;
  changePct: string;
  marketCap: string;
  volume: string;
  peRatio: string;
  fiftyTwoWeekHigh?: string;
  fiftyTwoWeekLow?: string;
  lastUpdated?: string;
}

interface SyncStatus {
  isSyncing: boolean;
  phase: string;
  totalStocks: number;
  quotesSynced: number;
  historySynced: number;
  currentTicker: string;
  totalHistoricalRecords: number;
  totalStocksInDb: number;
}

export default function DbStocksTab() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'marketCap' | 'price' | 'changePct' | 'ticker' | 'peRatio'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    fetchStocks();
    fetchStatus();
  }, []);

  // Poll status while syncing
  useEffect(() => {
    let interval: any;
    if (syncStatus?.isSyncing) {
      interval = setInterval(() => {
        fetchStatus();
        fetchStocks(false);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [syncStatus?.isSyncing]);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/bist/status');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchStocks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await apiFetch('/api/bist/universe?limit=1000');
      if (!res.ok) throw new Error('Hisseler yüklenemedi');
      const data = await res.json();
      setStocks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleFullSync = async () => {
    try {
      setError(null);
      const res = await apiFetch('/api/bist/sync-all', {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Senkronizasyon başlatılamadı');
      }
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter and sort stocks
  const filteredStocks = stocks.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.ticker.toLowerCase().includes(q) || (s.companyName && s.companyName.toLowerCase().includes(q));
  });

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    if (sortField === 'ticker') {
      valA = a.ticker;
      valB = b.ticker;
      return sortOrder === 'asc' 
        ? (valA as string).localeCompare(valB as string)
        : (valB as string).localeCompare(valA as string);
    } else if (sortField === 'price') {
      valA = parseFloat(a.price || '0');
      valB = parseFloat(b.price || '0');
    } else if (sortField === 'changePct') {
      valA = parseFloat(a.changePct || '0');
      valB = parseFloat(b.changePct || '0');
    } else if (sortField === 'marketCap') {
      valA = parseFloat(a.marketCap || '0');
      valB = parseFloat(b.marketCap || '0');
    } else if (sortField === 'peRatio') {
      valA = parseFloat(a.peRatio || '0');
      valB = parseFloat(b.peRatio || '0');
    }

    return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  // Pagination
  const totalPages = Math.ceil(sortedStocks.length / pageSize) || 1;
  const paginatedStocks = sortedStocks.slice((page - 1) * pageSize, page * pageSize);

  // Stats calculation
  const totalInDb = stocks.length;
  const gainers = stocks.filter(s => parseFloat(s.changePct || '0') > 0).length;
  const losers = stocks.filter(s => parseFloat(s.changePct || '0') < 0).length;
  const totalMarketCap = stocks.reduce((acc, s) => acc + (parseFloat(s.marketCap || '0') || 0), 0);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Database className="text-emerald-500" />
            625+ BIST Tüm Hisse Senetleri & Tarihsel Fiyat Veritabanı
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            KAP resmi şirketler rehberindeki tüm BIST hisseleri (A, B, Ana Pazar, Yıldız Pazar, Alt Pazar) ve 5 yıllık OHLCV kapanış serileri.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFullSync}
            disabled={syncStatus?.isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncStatus?.isSyncing ? 'animate-spin' : ''} />
            <span>
              {syncStatus?.isSyncing ? '625+ Hisse Çekiliyor...' : 'Tüm 625+ Hisseyi ve Geçmişi Çek'}
            </span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus?.isSyncing && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300 text-sm">
              <RefreshCw size={16} className="animate-spin text-emerald-600" />
              <span>
                {syncStatus.phase === 'FETCHING_KAP_COMPANIES' && 'KAP üzerinden 700+ BIST şirketi listeleniyor...'}
                {syncStatus.phase === 'SYNCING_QUOTES' && `Canlı Fiyatlar Çekiliyor: ${syncStatus.quotesSynced} / ${syncStatus.totalStocks} hisse tamamlandı`}
                {syncStatus.phase === 'SYNCING_5Y_HISTORY' && `5 Yıllık Fiyat & OHLCV Çekiliyor: ${syncStatus.currentTicker} (${syncStatus.historySynced} hisse, ${syncStatus.totalHistoricalRecords} kayıt)`}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {syncStatus.totalStocks > 0 ? Math.round((syncStatus.quotesSynced / syncStatus.totalStocks) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-2 transition-all duration-300 rounded-full" 
              style={{ width: `${syncStatus.totalStocks > 0 ? (syncStatus.quotesSynced / syncStatus.totalStocks) * 100 : 5}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="text-xs text-neutral-500 font-medium">Kayıtlı BIST Şirketleri</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            {totalInDb} <span className="text-xs font-normal text-neutral-400">/ 625+</span>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="text-xs text-neutral-500 font-medium">Toplam Piyasa Değeri</div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            ₺{(totalMarketCap / 1e12).toFixed(2)}T
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="text-xs text-neutral-500 font-medium">Günün Yükselenleri</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp size={20} />
            {gainers}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="text-xs text-neutral-500 font-medium">Günün Düşenleri</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
            <TrendingDown size={20} />
            {losers}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Hisse kodu veya şirket adı ara (örn: THYAO, BİMAS)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs text-neutral-500">
            Toplam <strong>{sortedStocks.length}</strong> hisse listeleniyor
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs py-1.5 px-2 text-neutral-700 dark:text-neutral-300"
          >
            <option value={25}>25 Hisse</option>
            <option value={50}>50 Hisse</option>
            <option value={100}>100 Hisse</option>
            <option value={500}>500 Hisse</option>
            <option value={1000}>Tümü (625+)</option>
          </select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-950/50 text-neutral-500 dark:text-neutral-400 select-none">
              <tr>
                <th 
                  onClick={() => toggleSort('ticker')}
                  className="p-4 font-semibold cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  Sembol {sortField === 'ticker' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-4 font-semibold">Şirket Ünvanı</th>
                <th 
                  onClick={() => toggleSort('price')}
                  className="p-4 font-semibold text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  Son Fiyat {sortField === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => toggleSort('changePct')}
                  className="p-4 font-semibold text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  Günlük Değişim {sortField === 'changePct' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => toggleSort('marketCap')}
                  className="p-4 font-semibold text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  Piyasa Değeri {sortField === 'marketCap' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => toggleSort('peRatio')}
                  className="p-4 font-semibold text-right cursor-pointer hover:text-neutral-900 dark:hover:text-white"
                >
                  F/K {sortField === 'peRatio' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-500" />
                    Hisseler yükleniyor...
                  </td>
                </tr>
              ) : paginatedStocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500">
                    Kayıtlı hisse bulunamadı. Lütfen "Tüm 625+ Hisseyi Çek" butonuna basarak senkronize edin.
                  </td>
                </tr>
              ) : (
                paginatedStocks.map((s) => {
                  const change = parseFloat(s.changePct || '0');
                  const isPos = change > 0;
                  const isNeg = change < 0;
                  const price = parseFloat(s.price || '0');
                  const mcap = parseFloat(s.marketCap || '0');
                  const pe = parseFloat(s.peRatio || '0');

                  return (
                    <tr key={s.id || s.ticker} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="p-4 font-bold text-neutral-900 dark:text-white font-mono">
                        {s.ticker}
                      </td>
                      <td className="p-4 text-neutral-700 dark:text-neutral-300 max-w-xs truncate" title={s.companyName}>
                        {s.companyName || s.ticker}
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-neutral-900 dark:text-white">
                        ₺{price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold">
                        <span className={`inline-flex items-center gap-1 ${
                          isPos ? 'text-emerald-500' : isNeg ? 'text-red-500' : 'text-neutral-400'
                        }`}>
                          {isPos && <TrendingUp size={13} />}
                          {isNeg && <TrendingDown size={13} />}
                          {change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
                        </span>
                      </td>
                      <td className="p-4 text-right text-neutral-600 dark:text-neutral-400 font-mono">
                        {mcap > 1e9 
                          ? `₺${(mcap / 1e9).toFixed(2)} Milyar` 
                          : mcap > 1e6 
                            ? `₺${(mcap / 1e6).toFixed(1)} Milyon` 
                            : mcap > 0 ? `₺${mcap.toLocaleString('tr-TR')}` : '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-neutral-600 dark:text-neutral-400">
                        {pe > 0 ? pe.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <div>
              Sayfa {page} / {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
