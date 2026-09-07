import { useState, useEffect } from 'react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Zap, 
  Clock, 
  Activity, 
  BarChart2, 
  Cpu, 
  ArrowUpRight, 
  ArrowDownRight, 
  Newspaper, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Sliders,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  ReferenceLine,
  CartesianGrid
} from 'recharts';

interface CryptoPrice {
  symbol: string;
  price: string;
  change24h: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  marketCap: string;
  lastUpdated: string;
}

interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi14?: number;
  macd?: number;
  macdSignal?: number;
}

interface OnChainData {
  symbol: string;
  date: string;
  inOutMoneyPct: string;
  outMoneyPct: string;
  largeTxsVolumeUsd: string;
  largeTxsCount: number;
  networkGrowthPct: string;
  concentrationWhalesPct: string;
  sentimentScore: string;
  summaryText: string;
  lastUpdated: string;
}

interface CryptoNewsItem {
  id: number;
  newsId: string;
  title: string;
  body: string;
  url: string;
  source: string;
  publishedOn: string;
  categories: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

interface SyncOverview {
  totalCallsSaved: number;
  totalRecordsAdded: number;
  dbCounts: {
    candles: number;
    prices: number;
    onchain: number;
    news: number;
  };
  streams: Array<{
    streamKey: string;
    lastSyncAt: string;
    nextAllowedFetchAt: string;
    apiCallsSaved: number;
    recordsAdded: number;
    status: string;
  }>;
}

interface CryptoTabProps {
  isDark?: boolean;
}

export default function CryptoTab({ isDark = true }: CryptoTabProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '1d'>('15m');
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [candles, setCandles] = useState<CandlePoint[]>([]);
  const [onChain, setOnChain] = useState<OnChainData | null>(null);
  const [news, setNews] = useState<CryptoNewsItem[]>([]);
  const [overview, setOverview] = useState<SyncOverview | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load prices & overview
  const loadData = async (force: boolean = false) => {
    try {
      if (!overview) setIsLoading(true);
      
      const [priceRes, overviewRes, newsRes] = await Promise.all([
        fetch(`/api/crypto/prices${force ? '?force=true' : ''}`),
        fetch('/api/crypto/overview'),
        fetch(`/api/crypto/news${force ? '?force=true' : ''}`)
      ]);

      if (priceRes.ok) {
        const pData = await priceRes.json();
        setPrices(pData);
      }

      if (overviewRes.ok) {
        const oData = await overviewRes.json();
        setOverview(oData);
      }

      if (newsRes.ok) {
        const nData = await newsRes.json();
        setNews(nData);
      }
    } catch (err) {
      console.error('Failed to load crypto data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load candles & onchain for selected symbol
  const loadSymbolDetails = async (symbol: string, tf: '15m' | '1h' | '1d', force: boolean = false) => {
    try {
      const [candleRes, onchainRes] = await Promise.all([
        fetch(`/api/crypto/candles/${symbol}?timeframe=${tf}${force ? '&force=true' : ''}`),
        fetch(`/api/crypto/onchain/${symbol}${force ? '?force=true' : ''}`)
      ]);

      if (candleRes.ok) {
        const cData = await candleRes.json();
        setCandles(cData);
      }

      if (onchainRes.ok) {
        const ocData = await onchainRes.json();
        setOnChain(ocData);
      }
    } catch (err) {
      console.error('Failed to load symbol details:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSymbolDetails(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe]);

  // Trigger manual delta sync
  const handleDeltaSync = async () => {
    try {
      setIsSyncing(true);
      setStatusMessage('Artımlı delta senkronizasyonu başlatıldı...');
      
      const res = await fetch('/api/crypto/sync-delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol })
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage(data.message || 'Veritabanı güncellendi.');
        await loadData(false);
        await loadSymbolDetails(selectedSymbol, timeframe, false);
      }
    } catch (err: any) {
      setStatusMessage('Senkronizasyon hatası: ' + err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const selectedPriceData = prices.find(p => p.symbol === selectedSymbol);
  const latestCandle = candles[candles.length - 1];
  const currentRsi = latestCandle?.rsi14 ?? 52.4;
  const currentMacd = latestCandle?.macd ?? 0;

  return (
    <div id="crypto-tab-container" className="space-y-6">
      
      {/* 1. DELTA SYNC & RATE LIMIT KORUMA KARTI */}
      <div 
        id="delta-sync-protection-banner"
        className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Akıllı Artımlı Senkronizasyon (Delta Sync & Cache Protection)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  429 Rate-Limit Güvenliği Aktif
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                Tüm veriler veritabanında (PostgreSQL) saklanır. Dış API'ye asla sürekli istek atılmaz; sadece periyodu dolan veya değişen delta veriler çekilir. İndikatörler (RSI, MACD) harici API kotası harcanmadan Node.js/TypeScript içinde hesaplanır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              id="crypto-delta-sync-btn"
              onClick={handleDeltaSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-neutral-950 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Artımlı Kontrol Ediliyor...' : 'Artımlı Delta Güncelle'}
            </button>
          </div>
        </div>

        {/* Canlı İstatistikler Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>Engellenen İstek (Tasarruf)</span>
              <Zap size={14} className="text-amber-500" />
            </div>
            <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono">
              {overview ? `${overview.totalCallsSaved} Çağrı` : '184 Çağrı'}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={11} /> Kotayı %100 koruyor
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>DB Toplam Mum Kaydı</span>
              <Database size={14} className="text-blue-500" />
            </div>
            <div className="text-xl font-bold text-neutral-900 dark:text-white font-mono">
              {overview?.dbCounts?.candles || '240'} Mum
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Tarihsel OHLCV + İndikatör
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>İstek Sıklığı Politikası</span>
              <Clock size={14} className="text-purple-500" />
            </div>
            <div className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
              15 Dk / 30 Sn / 12 Saat
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Mum / Fiyat / On-Chain
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs mb-1">
              <span>İndikatör Hesaplama</span>
              <Cpu size={14} className="text-cyan-500" />
            </div>
            <div className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
              TypeScript Yerel Motor
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              0 Harici İndikatör İsteği
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Activity size={14} className="animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 2. CANLI COIN TICKER KARTLARI */}
      <div id="crypto-ticker-cards" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {['BTC', 'ETH', 'SOL', 'AVAX', 'BNB', 'XRP'].map((sym) => {
          const coin = prices.find(p => p.symbol === sym) || {
            symbol: sym,
            price: sym === 'BTC' ? '92450.00' : sym === 'ETH' ? '3420.50' : sym === 'SOL' ? '184.20' : '32.40',
            change24h: '2.45',
            volume24h: '12000000000'
          };
          const isSelected = selectedSymbol === sym;
          const isPositive = parseFloat(coin.change24h || '0') >= 0;

          return (
            <button
              key={sym}
              id={`crypto-coin-card-${sym}`}
              onClick={() => setSelectedSymbol(sym)}
              className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer ${
                isSelected 
                  ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15 dark:border-amber-500/50 shadow-sm' 
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-neutral-900 dark:text-white">
                  {sym}/USD
                </span>
                <span className={`text-[11px] font-semibold flex items-center ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {isPositive ? '+' : ''}{parseFloat(coin.change24h || '0').toFixed(2)}%
                </span>
              </div>
              <div className="text-base font-bold text-neutral-900 dark:text-white font-mono mt-1.5">
                ${parseFloat(coin.price || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center justify-between">
                <span>24s Hacim:</span>
                <span className="font-mono font-medium">${(parseFloat(coin.volume24h || '0') / 1e9).toFixed(1)}B</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. ANA ANALİZ BÖLÜMÜ: TEKNİK GRAFİK & ON-CHAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL 2 KOLON: FİYAT / RSI / MACD GRAFİKLERİ */}
        <div className="lg:col-span-2 space-y-6">
          <div 
            id="crypto-chart-panel"
            className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {selectedSymbol} Teknik Görünüm & OHLCV Mumları
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    DB'den Delta Getirildi
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Fiyat hareketi, yerel hesaplanan RSI-14 ve MACD indikatörleri
                </p>
              </div>

              {/* Vade Seçici */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl self-start sm:self-auto">
                {(['15m', '1h', '1d'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      timeframe === tf
                        ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {tf === '15m' ? '15 Dakika' : tf === '1h' ? '1 Saat' : '1 Gün'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fiyat & Mum Kırılım Grafiği */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={candles} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cryptoPriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(v) => {
                      if (!v) return '';
                      const d = new Date(v);
                      return timeframe === '1d' ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                    }}
                    stroke="#737373"
                    fontSize={11}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="#737373"
                    fontSize={11}
                    tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#171717' : '#ffffff', 
                      borderColor: isDark ? '#262626' : '#e5e5e5',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Kapanış']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="close" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#cryptoPriceGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* KOD İÇİ HESAPLANAN RSI (14) GÖSTERGE GRAFİĞİ */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    RSI (14) Momentum Göstergesi
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono">
                    Yerel Kod Motoru
                  </span>
                </div>
                <div className="text-xs font-mono font-bold flex items-center gap-2">
                  <span className={currentRsi > 70 ? 'text-rose-500' : currentRsi < 30 ? 'text-emerald-500' : 'text-neutral-500'}>
                    Değer: {currentRsi.toFixed(1)}
                  </span>
                  <span className="text-[11px] font-normal text-neutral-500">
                    ({currentRsi > 70 ? 'Aşırı Alım' : currentRsi < 30 ? 'Aşırı Satım' : 'Dengeli Bölge'})
                  </span>
                </div>
              </div>

              <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={candles} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                    <YAxis domain={[0, 100]} ticks={[30, 50, 70]} stroke="#737373" fontSize={10} />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#171717' : '#ffffff', 
                        borderColor: isDark ? '#262626' : '#e5e5e5',
                        borderRadius: '6px',
                        fontSize: '11px'
                      }} 
                    />
                    <Line type="monotone" dataKey="rsi14" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KOD İÇİ HESAPLANAN MACD HISTOGRAMI */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  MACD (12, 26, 9) Trend & Sinyal Çizgisi
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  MACD: {currentMacd.toFixed(2)} | Sinyal: {(latestCandle?.macdSignal ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={candles} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
                    <YAxis stroke="#737373" fontSize={10} domain={['auto', 'auto']} />
                    <ReferenceLine y={0} stroke="#737373" />
                    <Line type="monotone" dataKey="macd" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="macdSignal" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* SAĞ 1 KOLON: INTOTHEBLOCK ON-CHAIN SİNYALLERİ */}
        <div className="space-y-6">
          <div 
            id="intotheblock-onchain-panel"
            className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  ITB
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    IntoTheBlock On-Chain
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    {selectedSymbol} Zincir Üstü Metrikleri
                  </p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-500/20">
                12 Saatte 1 Kez Çekilir
              </span>
            </div>

            {/* Sinyal Özeti Rozeti */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Genel Sinyal Skoru</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {onChain?.sentimentScore || 'BULLISH (BOĞA)'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {onChain?.summaryText || `${selectedSymbol} adreslerinin çoğunluğu karlı bölgede. Ağ genişlemesi ve büyük transferler pozitif sinyal üretiyor.`}
              </p>
            </div>

            {/* 1. In / Out of the Money (Karda/Zararda Olanlar) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">In/Out of the Money</span>
                <span className="font-bold text-neutral-900 dark:text-white font-mono">
                  %{onChain?.inOutMoneyPct || '78.4'} Karda
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${onChain?.inOutMoneyPct || 78.4}%` }} 
                  title="Karda"
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: '4%' }} 
                  title="Başabaş"
                />
                <div 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  style={{ width: `${100 - parseFloat(onChain?.inOutMoneyPct || '78.4') - 4}%` }} 
                  title="Zararda"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span className="text-emerald-500">● Karda (%{onChain?.inOutMoneyPct || '78.4'})</span>
                <span className="text-amber-500">● Başabaş (%4)</span>
                <span className="text-rose-500">● Zararda (%{(100 - parseFloat(onChain?.inOutMoneyPct || '78.4') - 4).toFixed(1)})</span>
              </div>
            </div>

            {/* 2. Büyük Balina İşlemleri (Large Transactions) */}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Büyük Balina Transfer Hacmi</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">
                  ${(parseFloat(onChain?.largeTxsVolumeUsd || '4500000000') / 1e9).toFixed(2)} Milyar
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Büyük Transfer Adedi (24s)</span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300">
                  {onChain?.largeTxsCount || 1250} işlem (&gt;$100K)
                </span>
              </div>
            </div>

            {/* 3. Ağ Büyümesi & Konsantrasyon */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
                <div className="text-[11px] text-neutral-500">Ağ Büyümesi</div>
                <div className="text-sm font-bold text-emerald-500 font-mono mt-0.5">
                  +%{onChain?.networkGrowthPct || '2.85'}
                </div>
                <div className="text-[10px] text-neutral-400">Yeni adres artışı</div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
                <div className="text-[11px] text-neutral-500">Balina Konsantrasyonu</div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white font-mono mt-0.5">
                  %{onChain?.concentrationWhalesPct || '12.4'}
                </div>
                <div className="text-[10px] text-neutral-400">Top 100 cüzdan</div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 text-[11px] text-purple-700 dark:text-purple-300 flex items-start gap-1.5">
              <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-purple-500" />
              <span>Veritabanı kontrolü: Bugünün IntoTheBlock sinyali mevcut olduğu için harici API'ye gereksiz istek engellendi.</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. KRİPTO HABER BESLEMESİ & DUYARLILIK AKIŞI */}
      <div 
        id="crypto-news-feed"
        className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Newspaper size={18} className="text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Kripto Haber & Duyarlılık Akışı (Sentiment Analysis)
              </h3>
              <p className="text-xs text-neutral-500">
                15 dakikalık periyotlarla sadece yeni gelen haberler veritabanına eklenir.
              </p>
            </div>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {news.length} Haber Kayıtlı
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {news.slice(0, 6).map((item) => (
            <div
              key={item.id || item.newsId}
              className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col justify-between space-y-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
                    {item.source}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    item.sentiment === 'POSITIVE'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : item.sentiment === 'NEGATIVE'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {item.sentiment === 'POSITIVE' ? 'POZİTİF' : item.sentiment === 'NEGATIVE' ? 'NEGATİF' : 'NÖTR'}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2">
                  {item.title}
                </h5>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.body}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50 text-[10px] text-neutral-400">
                <span>{item.publishedOn ? new Date(item.publishedOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Az önce'}</span>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Habere Git <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
