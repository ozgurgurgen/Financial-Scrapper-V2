import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function CryptoAllCoinsTab() {
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCoins = async (force = false) => {
    try {
      if (force) setLoading(true);
      const res = await apiFetch(`/api/crypto/prices${force ? '?force=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        setCoins(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const triggerBackfill = async () => {
    try {
      setLoading(true);
      await apiFetch('/api/v1/backfill/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'CRYPTO' })
      });
      alert('Kripto 5 yıllık geçmiş veri aktarımı başlatıldı (Arka Planda Çalışıyor).');
    } catch (e) {
      console.error(e);
      alert('Backfill tetiklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoins();
  }, []);

  const filtered = coins.filter(c => c.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Zap className="text-emerald-500" />
            Top 500 Kripto Listesi
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Veritabanında kayıtlı en büyük {coins.length > 0 ? coins.length : 500} kripto varlığın anlık piyasa verileri.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={triggerBackfill}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            Tarihsel Mumları Çek (5 Yıl)
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Sembol ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => fetchCoins(true)}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-neutral-500 dark:text-neutral-400">Sembol</th>
                <th className="px-6 py-4 font-semibold text-neutral-500 dark:text-neutral-400 text-right">Fiyat</th>
                <th className="px-6 py-4 font-semibold text-neutral-500 dark:text-neutral-400 text-right">24s Değişim</th>
                <th className="px-6 py-4 font-semibold text-neutral-500 dark:text-neutral-400 text-right">24s Yüksek / Düşük</th>
                <th className="px-6 py-4 font-semibold text-neutral-500 dark:text-neutral-400 text-right">Hacim / Market Cap</th>
                <th className="px-6 py-4 font-semibold text-neutral-500 dark:text-neutral-400 text-right">Son Güncelleme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filtered.map(coin => {
                const change = parseFloat(coin.change24h || '0');
                const isPositive = change >= 0;
                
                return (
                  <tr key={coin.symbol} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        {coin.symbol} <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 font-mono">/USDT</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-neutral-900 dark:text-white">
                      ${parseFloat(coin.price || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                        isPositive 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(change).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="text-emerald-500">${parseFloat(coin.high24h || '0').toFixed(2)}</span> / 
                      <span className="text-rose-500 ml-1">${parseFloat(coin.low24h || '0').toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono text-xs text-neutral-900 dark:text-white">Vol: ${(parseFloat(coin.volume24h || '0') / 1e6).toFixed(1)}M</div>
                      <div className="font-mono text-[10px] text-neutral-400 mt-0.5">MCap: ${(parseFloat(coin.marketCap || '0') / 1e6).toFixed(1)}M</div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-neutral-400">
                      {new Date(coin.lastUpdated).toLocaleTimeString('tr-TR')}
                    </td>
                  </tr>
                );
              })}
              
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                    Sonuç bulunamadı veya henüz veri çekilmedi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
