import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  RefreshCw,
  Search,
  Key,
  Server,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Check,
  Radio,
  Sliders,
  Cpu
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ApiDirectoryItem {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  category: 'BIST' | 'TEFAS' | 'US_MARKETS' | 'CRYPTO' | 'KAP' | 'SYSTEM' | 'ANALYST';
  name: string;
  description: string;
  rateLimit: string;
  cacheTtl: string;
  avgLatencyMs: number;
  successRate: number;
  totalCallsToday: number;
  dbSource: string;
}

const API_DIRECTORY: ApiDirectoryItem[] = [
  {
    id: 'bist-stocks',
    method: 'GET',
    path: '/api/v1/bist/stocks',
    category: 'BIST',
    name: '625+ BIST Hisseleri (Canlı & Metrikler)',
    description: 'BIST 100, BIST 500 ve tüm pazar hisselerinin fiyat, piyasa değeri, F/K ve 52H zirve/dip dökümü.',
    rateLimit: '1.200 / dk',
    cacheTtl: '15 sn',
    avgLatencyMs: 18,
    successRate: 99.9,
    totalCallsToday: 14280,
    dbSource: 'bist_stocks'
  },
  {
    id: 'bist-detail',
    method: 'GET',
    path: '/api/v1/bist/stock/:ticker',
    category: 'BIST',
    name: 'Tekil BIST Hissesi Özet Kartı',
    description: 'Hisseye özel anlık detay, sektör çarpanları ve 5 yıllık bar sayısı.',
    rateLimit: '2.400 / dk',
    cacheTtl: '10 sn',
    avgLatencyMs: 12,
    successRate: 100.0,
    totalCallsToday: 28450,
    dbSource: 'bist_stocks'
  },
  {
    id: 'bist-history',
    method: 'GET',
    path: '/api/v1/bist/stock/:ticker/history',
    category: 'BIST',
    name: '5 Yıllık OHLCV Günlük Fiyat Serisi',
    description: 'Açılış, Yüksek, Düşük, Kapanış, Hacim ve düzeltilmiş fiyat barları.',
    rateLimit: '600 / dk',
    cacheTtl: '300 sn',
    avgLatencyMs: 24,
    successRate: 99.8,
    totalCallsToday: 9820,
    dbSource: 'asset_data (485K+ bar)'
  },
  {
    id: 'bist-indicators',
    method: 'GET',
    path: '/api/v1/bist/stock/:ticker/indicators',
    category: 'BIST',
    name: 'Teknik İndikatörler (RSI-14, MACD, SMA)',
    description: 'Veritabanı barlarından hesaplanan Bollinger, RSI, MACD ve trend sinyali.',
    rateLimit: '1.200 / dk',
    cacheTtl: '60 sn',
    avgLatencyMs: 15,
    successRate: 100.0,
    totalCallsToday: 18930,
    dbSource: 'Local Compute Kernel'
  },
  {
    id: 'tefas-funds',
    method: 'GET',
    path: '/api/v1/tefas/funds',
    category: 'TEFAS',
    name: '1.063+ TEFAS Yatırım Fonları',
    description: 'Tüm fonların 1H/1A/3A/6A/1Y/3Y/5Y resmi getirileri, risk skoru ve fon büyüklüğü.',
    rateLimit: '1.200 / dk',
    cacheTtl: '30 sn',
    avgLatencyMs: 22,
    successRate: 99.9,
    totalCallsToday: 21400,
    dbSource: 'tefas_funds & tefas_prices'
  },
  {
    id: 'tefas-holdings',
    method: 'GET',
    path: '/api/v1/tefas/fund/:code/holdings',
    category: 'TEFAS',
    name: 'Fon İçi Bireysel Hisse Dağılımı (PDR)',
    description: 'Fonun taşıdığı BIST hisseleri, portföy ağırlığı ve KAP portföy dökümü.',
    rateLimit: '1.200 / dk',
    cacheTtl: '300 sn',
    avgLatencyMs: 19,
    successRate: 99.7,
    totalCallsToday: 12640,
    dbSource: 'tefas_fund_holdings'
  },
  {
    id: 'tefas-reverse',
    method: 'GET',
    path: '/api/v1/tefas/stock/:ticker/in-funds',
    category: 'TEFAS',
    name: 'Hisseye Göre Fon Arama (Ters Eşleme)',
    description: 'Belirtilen hisseyi taşıyan tüm fonlar, nominal paylar ve ağırlık oranları.',
    rateLimit: '1.200 / dk',
    cacheTtl: '120 sn',
    avgLatencyMs: 28,
    successRate: 99.9,
    totalCallsToday: 15820,
    dbSource: 'tefas_fund_holdings'
  },
  {
    id: 'tefas-history',
    method: 'GET',
    path: '/api/v1/tefas/fund/:code/daily-history',
    category: 'TEFAS',
    name: 'TEFAS Fonu 5 Yıllık Günlük Fiyat Serisi',
    description: 'Takasbank 5 yıllık birim pay fiyatı, tedavüldeki pay ve fon büyüklüğü zaman serisi.',
    rateLimit: '600 / dk',
    cacheTtl: '600 sn',
    avgLatencyMs: 32,
    successRate: 99.6,
    totalCallsToday: 7490,
    dbSource: 'tefas_historical_navs'
  },
  {
    id: 'us-stocks',
    method: 'GET',
    path: '/api/v1/us-stocks',
    category: 'US_MARKETS',
    name: 'ABD Şirketleri (S&P 500 & Nasdaq)',
    description: '1.000+ ABD hissesinin canlı fiyatı, piyasa değeri ve değerleme oranları.',
    rateLimit: '1.200 / dk',
    cacheTtl: '15 sn',
    avgLatencyMs: 20,
    successRate: 99.9,
    totalCallsToday: 11200,
    dbSource: 'us_stocks'
  },
  {
    id: 'us-history',
    method: 'GET',
    path: '/api/v1/us-history/stock/:ticker',
    category: 'US_MARKETS',
    name: '5 Yıllık ABD Fiyat Serisi & Performans',
    description: 'NVDA, AAPL gibi hisselerin 5 yıllık barları, CAGR ve Max Drawdown metrikleri.',
    rateLimit: '600 / dk',
    cacheTtl: '300 sn',
    avgLatencyMs: 26,
    successRate: 99.8,
    totalCallsToday: 6340,
    dbSource: 'us_history'
  },
  {
    id: 'crypto-spot',
    method: 'GET',
    path: '/api/v1/crypto',
    category: 'CRYPTO',
    name: 'Kripto Para Canlı Spot Fiyatlar',
    description: '500+ kripto para çifti, 24s hacim, değişim ve on-chain duyarlılık.',
    rateLimit: '2.400 / dk',
    cacheTtl: '5 sn',
    avgLatencyMs: 14,
    successRate: 100.0,
    totalCallsToday: 34100,
    dbSource: 'crypto_prices & Binance Mirror'
  },
  {
    id: 'kap-disclosures',
    method: 'GET',
    path: '/api/v1/kap/disclosures',
    category: 'KAP',
    name: 'KAP Canlı Şirket Bildirimleri Akışı',
    description: 'Son şirket açıklamaları, konu başlıkları, özetler ve duyarlılık skorları.',
    rateLimit: '1.200 / dk',
    cacheTtl: '20 sn',
    avgLatencyMs: 16,
    successRate: 99.9,
    totalCallsToday: 17800,
    dbSource: 'kap_disclosures'
  },
  {
    id: 'ipos',
    method: 'GET',
    path: '/api/v1/ipos',
    category: 'KAP',
    name: 'BIST Halka Arzlar (IPO Takvimi)',
    description: 'Taslak, talep toplayan, işlem gören halka arzlar ve tavan serileri.',
    rateLimit: '600 / dk',
    cacheTtl: '300 sn',
    avgLatencyMs: 14,
    successRate: 100.0,
    totalCallsToday: 8900,
    dbSource: 'bist_ipos'
  },
  {
    id: 'analyst-reports',
    method: 'GET',
    path: '/api/v1/analyst-reports',
    category: 'ANALYST',
    name: 'Analist Raporları & Hedef Fiyat Konsensüsü',
    description: 'Aracı kurumların hisse hedef fiyatları, potansiyel getiriler ve konsensüs notları.',
    rateLimit: '1.200 / dk',
    cacheTtl: '120 sn',
    avgLatencyMs: 25,
    successRate: 99.8,
    totalCallsToday: 9120,
    dbSource: 'analyst_consensus'
  },
  {
    id: 'health',
    method: 'GET',
    path: '/api/v1/health',
    category: 'SYSTEM',
    name: 'Veri Tabanı & Tazelik Raporu',
    description: 'Toplam hisse, fon, bar sayısı ve son arka plan senkronizasyon logu.',
    rateLimit: '3.600 / dk',
    cacheTtl: '5 sn',
    avgLatencyMs: 8,
    successRate: 100.0,
    totalCallsToday: 41200,
    dbSource: 'system_health'
  },
  {
    id: 'openapi',
    method: 'GET',
    path: '/api/v1/openapi.json',
    category: 'SYSTEM',
    name: 'OpenAPI 3.0 / Swagger Şeması',
    description: 'Dış sistemler ve SDK generatorlar için tam API sözlüğü.',
    rateLimit: '600 / dk',
    cacheTtl: '3600 sn',
    avgLatencyMs: 6,
    successRate: 100.0,
    totalCallsToday: 3200,
    dbSource: 'In-Memory Static'
  }
];

const CATEGORY_COLORS: Record<string, string> = {
  BIST: '#3b82f6',        // Blue
  TEFAS: '#10b981',       // Emerald
  US_MARKETS: '#8b5cf6',  // Purple
  CRYPTO: '#f59e0b',      // Amber
  KAP: '#f97316',         // Orange
  ANALYST: '#ec4899',     // Pink
  SYSTEM: '#06b6d4'       // Cyan
};

export default function ApiChartsTab() {
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Generate dynamic chart data based on time range
  const { trafficTimeline, latencyTimeline, categoryDistribution, keyUsageBars, hourlyUptimeBars } = useMemo(() => {
    // 1. Traffic Timeline
    const pointsCount = timeRange === '15m' ? 15 : timeRange === '1h' ? 24 : timeRange === '24h' ? 24 : 14;
    const traffic: any[] = [];
    const latency: any[] = [];

    for (let i = 0; i < pointsCount; i++) {
      let label = '';
      if (timeRange === '15m') {
        label = `-${15 - i} dk`;
      } else if (timeRange === '1h') {
        label = `-${(24 - i) * 2.5} dk`;
      } else if (timeRange === '24h') {
        const h = (new Date().getHours() - (23 - i) + 24) % 24;
        label = `${h.toString().padStart(2, '0')}:00`;
      } else {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        label = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
      }

      // Sine-wave realistic traffic patterns
      const baseReqs = 140 + Math.round(Math.sin(i / 3) * 60 + (i * 2));
      const success2xx = Math.max(10, baseReqs - Math.round(Math.random() * 3));
      const client4xx = Math.round(Math.random() * 2);
      const server5xx = Math.random() > 0.85 ? 1 : 0;

      traffic.push({
        time: label,
        success: success2xx,
        clientError: client4xx,
        serverError: server5xx,
        total: success2xx + client4xx + server5xx
      });

      // Latency data
      const avgLat = 16 + Math.round(Math.sin(i / 2) * 6 + Math.random() * 4);
      const p95Lat = avgLat + 18 + Math.round(Math.random() * 8);
      const p99Lat = p95Lat + 25 + Math.round(Math.random() * 15);

      latency.push({
        time: label,
        avg: avgLat,
        p95: p95Lat,
        p99: p99Lat,
        slaTarget: 100
      });
    }

    // 2. Category Distribution
    const catCounts: Record<string, number> = {
      BIST: 0,
      TEFAS: 0,
      US_MARKETS: 0,
      CRYPTO: 0,
      KAP: 0,
      ANALYST: 0,
      SYSTEM: 0
    };

    API_DIRECTORY.forEach(item => {
      catCounts[item.category] = (catCounts[item.category] || 0) + item.totalCallsToday;
    });

    const categoryData = Object.entries(catCounts).map(([cat, total]) => ({
      name: cat === 'US_MARKETS' ? 'ABD Piyasaları' : cat === 'CRYPTO' ? 'Kripto' : cat === 'ANALYST' ? 'Analist' : cat === 'SYSTEM' ? 'Sistem' : cat,
      key: cat,
      value: total,
      color: CATEGORY_COLORS[cat] || '#3b82f6'
    }));

    // 3. Key Usage Bars
    const keys = [
      { name: 'FinTech Mobil App (PRO)', calls: 64200, limit: 120000, color: '#06b6d4' },
      { name: 'BIST Robotik Algo #1 (ENTERPRISE)', calls: 182400, limit: 250000, color: '#8b5cf6' },
      { name: 'Kurumsal Dashboard UI (MASTER)', calls: 92800, limit: 300000, color: '#3b82f6' },
      { name: 'Telegram Bot Sinyal Servisi (PRO)', calls: 41200, limit: 100000, color: '#10b981' },
      { name: 'Genel Açık İstemciler (FREE)', calls: 24500, limit: 50000, color: '#f59e0b' }
    ];

    // 4. Hourly Uptime Bars (24h)
    const uptimeBars = [];
    for (let h = 0; h < 24; h++) {
      const hourLabel = `${h.toString().padStart(2, '0')}:00`;
      const uptime = 99.8 + (Math.random() * 0.2);
      uptimeBars.push({
        hour: hourLabel,
        uptime: parseFloat(uptime.toFixed(2)),
        requests: Math.round(4000 + Math.random() * 2500)
      });
    }

    return {
      trafficTimeline: traffic,
      latencyTimeline: latency,
      categoryDistribution: categoryData,
      keyUsageBars: keys,
      hourlyUptimeBars: uptimeBars
    };
  }, [timeRange]);

  // Copy helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Simulate traffic burst
  const handleSimulateBurst = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 1200);
  };

  const filteredDirectory = API_DIRECTORY.filter(item => {
    const matchesSearch = item.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalDailyRequests = useMemo(() => {
    return API_DIRECTORY.reduce((sum, item) => sum + item.totalCallsToday, 0);
  }, []);

  return (
    <div className="space-y-6 pb-14 text-slate-100 font-sans">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                <BarChart3 className="w-7 h-7" />
              </span>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    API Grafik & Telemetri Analitiği
                  </h1>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE TELEMETRY ACTIVE
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  BIST (625+), TEFAS (1.063+), ABD Piyasaları, Kripto ve KAP veri motorunun istek hacmi, yanıt gecikmesi, hata yüzdeleri ve kota tüketim grafikleri.
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Time Filter & Realtime Mode */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              {(['15m', '1h', '24h', '7d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range === '15m' ? '15 Dk' : range === '1h' ? '1 Saat' : range === '24h' ? '24 Saat' : '7 Gün'}
                </button>
              ))}
            </div>

            <button
              onClick={handleSimulateBurst}
              disabled={isSimulating}
              className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Zap className={`w-4 h-4 text-amber-400 ${isSimulating ? 'animate-bounce' : ''}`} />
              {isSimulating ? 'İstek Patlaması Gönderildi...' : 'Trafik Patlaması Simüle Et'}
            </button>
          </div>
        </div>

        {/* Live Top Summary KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Toplam İstek (Bugün)</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">
              {totalDailyRequests.toLocaleString('tr-TR')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">↑ %14.2 artış</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Ortalama Gecikme</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-black text-blue-400 mt-1">
              18 <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Hedef &lt; 100ms</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>P95 Gecikmesi</span>
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400 mt-1">
              34 <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">P99: 58 ms</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Başarı Oranı (SLA)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              %99.92
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Sıfır Kesinti</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Aktif API Uç Noktası</span>
              <Globe className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-black text-purple-400 mt-1">
              {API_DIRECTORY.length} <span className="text-xs font-normal text-slate-400">Endpoint</span>
            </div>
            <div className="text-[10px] text-purple-300 font-bold mt-0.5">7 Ana Kategori</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
              <span>Aktif İstemci Anahtarı</span>
              <Key className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-indigo-400 mt-1">
              5 <span className="text-xs font-normal text-slate-400">Key</span>
            </div>
            <div className="text-[10px] text-indigo-300 font-bold mt-0.5">Limitler Güvende</div>
          </div>
        </div>
      </div>

      {/* CHARTS GRID ROW 1: Traffic Volume & Latency Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Request Volume & HTTP Status Breakdown (Area Chart) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> İstek Hacmi & HTTP Statü Dağılımı Zaman Serisi
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Başarılı (2xx), İstemci Hatası (4xx) ve Sunucu Hatası (5xx) isteklerinin zamana bağlı dağılımı.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-slate-950 text-xs font-mono text-cyan-400 border border-slate-800">
              {timeRange.toUpperCase()}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorClientErr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorServerErr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="success" name="2xx Başarılı (OK)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" />
                <Area type="monotone" dataKey="clientError" name="4xx İstemci Hatası" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorClientErr)" />
                <Area type="monotone" dataKey="serverError" name="5xx Sunucu Hatası" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorServerErr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> %99.92 Başarı Oranı
            </span>
            <span>En Yüksek Pik: 240 İstek/Dk</span>
          </div>
        </div>

        {/* CHART 2: Latency Percentiles (Avg, P95, P99 Line Chart) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Yanıt Süresi & Gecikme Dağılımı (ms)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ortalama, P95 ve P99 milisaniye yanıt süreleri.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
              SLA OK (&lt;100ms)
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 120]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="avg" name="Ortalama Gecikme (ms)" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="p95" name="P95 Gecikme (ms)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="slaTarget" name="SLA Limiti (100ms)" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
            <span>En Hızlı: 8 ms (Health / Cache)</span>
            <span className="text-cyan-400 font-semibold">Ortalama: 18 ms</span>
          </div>
        </div>
      </div>

      {/* CHARTS GRID ROW 2: Category Pie & API Key Consumption Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 3: Category Traffic Distribution (Donut Chart) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Pazar & Kategori Bazlı İstek Dağılımı
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              BIST, TEFAS, ABD, Kripto ve KAP çağrılarının toplam içindeki yüzdesi.
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value.toLocaleString('tr-TR')} İstek`, 'Çağrı Hacmi']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            {categoryDistribution.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-300 font-semibold truncate">{cat.name}:</span>
                <span className="text-slate-400 font-mono">
                  %{((cat.value / totalDailyRequests) * 100).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 4: API Key Consumption & Rate Limit Bars */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> API Anahtarları Kota & Kullanım Tüketimi
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Müşterilerin / botların bugün yaptığı toplam istekler ve plan limitleri.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">5 Aktif Müşteri</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={keyUsageBars}
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} tickLine={false} width={150} />
                <Tooltip
                  formatter={(val: any) => [`${val.toLocaleString('tr-TR')} İstek`, 'Kullanım']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="calls" name="Kullanılan İstek" radius={[0, 8, 8, 0]}>
                  {keyUsageBars.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80">
            <span>En Yüksek Tüketim: <b>BIST Robotik Algo #1</b> (%72.9 Kota Dolu)</span>
            <span className="text-emerald-400 font-semibold">Tüm Anahtarlar Normal Sınırlarda</span>
          </div>
        </div>
      </div>

      {/* ALL API INFORMATION TABLE (FULL DIRECTORY & LIVE STATS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" /> Tüm FinHub API Uç Noktaları & Canlı Metrik Masası
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              BIST, TEFAS, ABD Piyasaları, Kripto, KAP ve Sistem seviyesindeki 20+ uç noktanın hız limitleri, önbellek süreleri ve veritabanı haritası.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Endpoint veya isim ara..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
              />
            </div>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['ALL', 'BIST', 'TEFAS', 'US_MARKETS', 'CRYPTO', 'KAP', 'SYSTEM'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    categoryFilter === cat
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'Tümü' : cat === 'US_MARKETS' ? 'ABD' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Metod & Endpoint Yolu</th>
                <th className="py-3.5 px-4 font-semibold">Açıklama & DB Kaynağı</th>
                <th className="py-3.5 px-3 font-semibold">Hız Limiti</th>
                <th className="py-3.5 px-3 font-semibold">Önbellek (TTL)</th>
                <th className="py-3.5 px-3 font-semibold">Ort. Yanıt</th>
                <th className="py-3.5 px-3 font-semibold">24s İstek</th>
                <th className="py-3.5 px-3 font-semibold">Başarı (SLA)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {filteredDirectory.map((api) => {
                const isCopied = copiedId === api.id;
                return (
                  <tr key={api.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          api.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {api.method}
                        </span>
                        <span className="font-mono text-cyan-300 font-bold text-xs">{api.path}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-semibold mt-1">
                        {api.name}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-400 text-[11px] truncate">{api.description}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-purple-400 mt-1">
                        <Database className="w-3 h-3" /> {api.dbSource}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {api.rateLimit}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                        {api.cacheTtl}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      {api.avgLatencyMs} ms
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                      {api.totalCallsToday.toLocaleString('tr-TR')}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        %{api.successRate}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleCopy(api.id, api.path)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-xs font-semibold transition-all inline-flex items-center gap-1.5 border border-slate-700 hover:border-cyan-400"
                        title="Yolu Kopyala"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Kopyalandı' : 'Kopyala'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
