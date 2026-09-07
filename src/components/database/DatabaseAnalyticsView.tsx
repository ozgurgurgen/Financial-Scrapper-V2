import React, { useState, useEffect } from 'react';
import { 
  Database, HardDrive, Activity, Download, FileText, 
  RefreshCw, Layers, ShieldCheck, CheckCircle2, AlertCircle, 
  PieChart as PieIcon, BarChart3, TrendingUp, Cpu, Server, 
  ArrowUpRight, Clock, Copy, Check, Filter, Search, Sparkles
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, LineChart, Line 
} from 'recharts';
import { apiFetch } from '../../lib/api';

export interface TableMetric {
  tableName: string;
  displayName: string;
  category: 'FİYAT_SERİSİ' | 'FON_PORTFÖY' | 'KAP_HABER' | 'MAKRO_GÖSTERGE' | 'SİSTEM_LOG';
  rowCount: number;
  estimatedSizeBytes: number;
  sizeFormatted: string;
  percentOfTotal: number;
  description: string;
  primaryKey: string;
}

export interface DbAnalyticsSummary {
  totalRows: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  totalTables: number;
  databaseEngine: string;
  cacheHitRatioPct: number;
  storageQuotaMb: number;
  storageUsagePct: number;
  activeConnections: number;
  avgWriteLatencyMs: number;
  lastBackupAt: string;
}

export interface DailyActivityPoint {
  date: string;
  label: string;
  totalRecords: number;
  successfulSyncs: number;
  failedSyncs: number;
  tefasRecords: number;
  bistRecords: number;
  kapRecords: number;
  tcmbRecords: number;
  cryptoRecords: number;
  fredRecords: number;
}

export interface SourceDistribution {
  source: string;
  name: string;
  color: string;
  recordCount: number;
  percentage: number;
}

interface AnalyticsData {
  summary: DbAnalyticsSummary;
  tables: TableMetric[];
  activityTimeline: DailyActivityPoint[];
  sourceDistribution: SourceDistribution[];
  hourlyTraffic: Array<{ hour: string; inserts: number; queries: number }>;
}

export const DatabaseAnalyticsView: React.FC<{ isDark?: boolean }> = ({ isDark = true }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TABLES' | 'ACTIVITY' | 'EXPORTS'>('OVERVIEW');

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/db/analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error(`Sunucu yanıt vermedi: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Veritabanı metrikleri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleExport = (format: 'csv' | 'json' | 'sql', type: 'tables' | 'activity' | 'all') => {
    window.open(`/api/db/export?format=${format}&type=${type}`, '_blank');
  };

  const copySummaryToClipboard = () => {
    if (!data) return;
    const text = `PostgreSQL Veritabanı Telemetri Özeti:
Toplam Kayıt: ${data.summary.totalRows.toLocaleString('tr-TR')}
Toplam Boyut: ${data.summary.totalSizeFormatted}
Tablo Sayısı: ${data.summary.totalTables}
Önbellek İsabeti: %${data.summary.cacheHitRatioPct}
Depolama Kotası: ${data.summary.storageQuotaMb} MB (%${data.summary.storageUsagePct} kullanım)
Veritabanı Motoru: ${data.summary.databaseEngine}`;
    navigator.clipboard.writeText(text);
    setCopiedType('summary');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const filteredTables = data?.tables.filter(t => {
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesSearch = t.tableName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  }) || [];

  const CATEGORY_COLORS: Record<string, string> = {
    'FİYAT_SERİSİ': '#3b82f6',
    'FON_PORTFÖY': '#a855f7',
    'KAP_HABER': '#f59e0b',
    'MAKRO_GÖSTERGE': '#ef4444',
    'SİSTEM_LOG': '#10b981'
  };

  const CATEGORY_LABELS: Record<string, string> = {
    'FİYAT_SERİSİ': 'Fiyat & Zaman Serisi',
    'FON_PORTFÖY': 'TEFAS Fon & Portföy',
    'KAP_HABER': 'KAP Bildirim & AI',
    'MAKRO_GÖSTERGE': 'TCMB & Makro',
    'SİSTEM_LOG': 'Sistem & Loglar'
  };

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-sm font-mono text-neutral-400">PostgreSQL veritabanı kullanım oranları ve hareketleri yükleniyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-950/40 border border-red-800/60 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <div className="text-base font-bold text-red-200">Veritabanı Analitiği Yüklenemedi</div>
        <p className="text-xs text-red-300/80 font-mono">{error}</p>
        <button 
          onClick={fetchMetrics}
          className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ─── 1. TOP HEADER & TELEMETRY CONTROLS ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Database size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                PostgreSQL Veritabanı Kullanım &amp; Hareket Analitiği
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ONLINE
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Bulut veritabanı tablo depolama oranları, veri ambarı hacmi, işlem debisi ve dışa aktarma (Export) merkezi.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub Navigation */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'OVERVIEW' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              📊 Genel Bakış
            </button>
            <button
              onClick={() => setActiveTab('TABLES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'TABLES' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              🗄️ Tablolar ({data.tables.length})
            </button>
            <button
              onClick={() => setActiveTab('ACTIVITY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ACTIVITY' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              ⚡ İşlem Hareketleri
            </button>
            <button
              onClick={() => setActiveTab('EXPORTS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'EXPORTS' 
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              📥 Dışa Aktar (Export)
            </button>
          </div>

          <button
            onClick={fetchMetrics}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── 2. TOP METRIC SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Records */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1 font-medium">
            <span>Toplam Kayıt</span>
            <Layers size={14} className="text-blue-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-neutral-900 dark:text-white font-mono">
            {data.summary.totalRows.toLocaleString('tr-TR')}
          </div>
          <div className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight size={12} /> {data.tables.length} Tabloda İndeksli
          </div>
        </div>

        {/* Database Size */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1 font-medium">
            <span>Disk Boyutu</span>
            <HardDrive size={14} className="text-purple-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {data.summary.totalSizeFormatted}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">
            Kota: {data.summary.storageQuotaMb} MB
          </div>
        </div>

        {/* Storage Quota Progress */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1 font-medium">
            <span>Kapasite Doluluğu</span>
            <Server size={14} className="text-cyan-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-neutral-900 dark:text-white font-mono">
            %{data.summary.storageUsagePct}
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, data.summary.storageUsagePct)}%` }}
            />
          </div>
        </div>

        {/* Cache Hit Ratio */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1 font-medium">
            <span>Önbellek İsabeti</span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-emerald-500 font-mono">
            %{data.summary.cacheHitRatioPct}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            RAM İçi Yüksek Performans
          </div>
        </div>

        {/* Latency & Pool */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1 font-medium">
            <span>Yazma Gecikmesi</span>
            <Activity size={14} className="text-amber-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-500 font-mono">
            {data.summary.avgWriteLatencyMs} ms
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">
            {data.summary.activeConnections} Aktif Havuz Client
          </div>
        </div>

        {/* Database Engine */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1 font-medium">
            <span>Veritabanı</span>
            <Cpu size={14} className="text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-neutral-900 dark:text-white font-mono truncate mt-1">
            PG 16 CLUSTER
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-1">
            Yedek: {data.summary.lastBackupAt}
          </div>
        </div>
      </div>

      {/* ─── 3. MAIN TAB CONTENT ─── */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Main Visual Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 7-Day Ingestion & Sync Activity Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-purple-500" />
                    Günlük Veri Girişi &amp; İşlem Debisi (Son 7 Gün)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Senkronize edilen yeni satırlar ve veri ambarı büyüme hızı
                  </p>
                </div>
                <button
                  onClick={() => handleExport('csv', 'activity')}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download size={13} /> CSV İndir
                </button>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.activityTimeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorTefas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorBist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#f0f0f0'} />
                    <XAxis dataKey="label" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#171717' : '#ffffff', 
                        borderColor: isDark ? '#404040' : '#e5e5e5',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="totalRecords" name="Toplam İşlenen Satır" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="tefasRecords" name="TEFAS Fon Fiyatı" stroke="#a855f7" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTefas)" />
                    <Area type="monotone" dataKey="bistRecords" name="BIST Hisse Barı" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBist)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source Distribution Donut Chart */}
            <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <PieIcon size={18} className="text-cyan-500" />
                  Kaynak Bazında Veri Dağılımı
                </h3>
                <p className="text-xs text-neutral-500">
                  Toplam veritabanı satırlarının sağlayıcı payları
                </p>
              </div>

              <div className="h-56 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sourceDistribution}
                      dataKey="recordCount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {data.sourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => `${Number(val).toLocaleString('tr-TR')} satır`}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#171717' : '#ffffff', 
                        borderColor: isDark ? '#404040' : '#e5e5e5',
                        borderRadius: '0.75rem',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-mono text-neutral-400">Veri Ambarı</span>
                  <span className="text-sm font-black font-mono text-neutral-900 dark:text-white">{data.summary.totalSizeFormatted}</span>
                </div>
              </div>

              {/* Source Legend Pills */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                {data.sourceDistribution.slice(0, 4).map((src) => (
                  <div key={src.source} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: src.color }} />
                      <span className="truncate text-neutral-700 dark:text-neutral-300 font-medium">{src.source}</span>
                    </div>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-[11px]">%{src.percentage}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 24-Hour Hourly Traffic (Inserts vs Queries) */}
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-amber-500" />
                  24 Saatlik DB Trafiği (Yazma vs Okuma İşlemleri)
                </h3>
                <p className="text-xs text-neutral-500">
                  Günün saatlerine göre otomatik cron arka plan yazma yükü ve kullanıcı sorgu frekansı
                </p>
              </div>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyTraffic} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#f0f0f0'} />
                  <XAxis dataKey="hour" stroke="#888888" fontSize={10} />
                  <YAxis stroke="#888888" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#171717' : '#ffffff', 
                      borderColor: isDark ? '#404040' : '#e5e5e5',
                      borderRadius: '0.75rem',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="inserts" name="Yazma (Inserts / Sync)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="queries" name="Okuma (SELECT Queries)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. TABLES BREAKDOWN TAB ─── */}
      {activeTab === 'TABLES' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                Tümü ({data.tables.length})
              </button>
              {Object.keys(CATEGORY_LABELS).map((catKey) => {
                const count = data.tables.filter(t => t.category === catKey).length;
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCategory === catKey
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                    }`}
                  >
                    {CATEGORY_LABELS[catKey]} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-neutral-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tablo adı veya açıklama ara..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Table List Cards */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-3.5 px-4 font-bold">TABLO ADI &amp; GÖREVİ</th>
                    <th className="py-3.5 px-4 font-bold">KATEGORİ</th>
                    <th className="py-3.5 px-4 font-bold text-right">SATIR SAYISI</th>
                    <th className="py-3.5 px-4 font-bold text-right">DİSK BOYUTU</th>
                    <th className="py-3.5 px-4 font-bold">TOPLAM PAYI</th>
                    <th className="py-3.5 px-4 font-bold text-center">İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-sans">
                  {filteredTables.map((t) => (
                    <tr key={t.tableName} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <Database size={13} className="text-purple-500 shrink-0" />
                          <span>{t.tableName}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {t.displayName} · <span className="italic">{t.description}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                          style={{ 
                            backgroundColor: `${CATEGORY_COLORS[t.category] || '#888'}20`, 
                            color: CATEGORY_COLORS[t.category] || '#888',
                            border: `1px solid ${CATEGORY_COLORS[t.category] || '#888'}40`
                          }}
                        >
                          {CATEGORY_LABELS[t.category] || t.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white text-sm">
                        {t.rowCount.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                        {t.sizeFormatted}
                      </td>
                      <td className="py-3 px-4 w-40">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                            <span>%{t.percentOfTotal}</span>
                          </div>
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.max(2, t.percentOfTotal)}%`,
                                backgroundColor: CATEGORY_COLORS[t.category] || '#a855f7'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            const text = `SELECT * FROM ${t.tableName} LIMIT 100;`;
                            navigator.clipboard.writeText(text);
                            setCopiedType(t.tableName);
                            setTimeout(() => setCopiedType(null), 1500);
                          }}
                          className="px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[10px] font-mono transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="SQL sorgusunu kopyala"
                        >
                          {copiedType === t.tableName ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>SQL</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. ACTIVITY LOGS & HISTORICAL MOVEMENTS TAB ─── */}
      {activeTab === 'ACTIVITY' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  Günlük Senkronizasyon &amp; Veritabanı Yazma Hareketleri
                </h3>
                <p className="text-xs text-neutral-500">
                  Her gün için tamamlanan işlem adetleri ve kaynaklara göre kayıt akışı
                </p>
              </div>
              <button
                onClick={() => handleExport('csv', 'activity')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download size={14} /> Aktivite CSV İndir
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-3 px-4 font-bold">TARİH</th>
                    <th className="py-3 px-4 font-bold text-right">TOPLAM KAYIT</th>
                    <th className="py-3 px-4 font-bold text-right">TEFAS</th>
                    <th className="py-3 px-4 font-bold text-right">BIST 100</th>
                    <th className="py-3 px-4 font-bold text-right">KAP &amp; AI</th>
                    <th className="py-3 px-4 font-bold text-right">TCMB</th>
                    <th className="py-3 px-4 font-bold text-right">KRİPTO</th>
                    <th className="py-3 px-4 font-bold text-center">DURUM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                  {data.activityTimeline.map((act) => (
                    <tr key={act.date} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                        {act.label} <span className="text-[10px] text-neutral-400 font-normal">({act.date})</span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-purple-600 dark:text-purple-400">
                        +{act.totalRecords.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-400 font-medium">
                        {act.tefasRecords.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-400 font-medium">
                        {act.bistRecords.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-400 font-medium">
                        {act.kapRecords.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right text-red-400 font-medium">
                        {act.tcmbRecords.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-medium">
                        {act.cryptoRecords.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {act.successfulSyncs} Başarılı
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. EXPORTS & BACKUP CENTER TAB ─── */}
      {activeTab === 'EXPORTS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Download size={20} className="text-purple-500" />
                Veritabanı Dışa Aktarma &amp; Raporlama Merkezi (Exports)
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Tüm tabloların depolama metriklerini, canlı işlem kayıtlarını ve PostgreSQL şema özetini farklı formatlarda indirin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Option 1: CSV Table Usage */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Tablo Kullanım &amp; Boyut Raporu</h4>
                  <p className="text-xs text-neutral-500">
                    Tüm {data.tables.length} tablonun satır sayıları, disk kullanım payları (%) ve kategorilerini içeren Excel/CSV dosyası.
                  </p>
                </div>
                <button
                  onClick={() => handleExport('csv', 'tables')}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download size={14} /> Tabloları İndir (.CSV)
                </button>
              </div>

              {/* Option 2: CSV Activity Logs */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Activity size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">İşlem Hareketleri &amp; Loglar</h4>
                  <p className="text-xs text-neutral-500">
                    Günlük eklenen kayıtlar, servis bazında TEFAS, BIST, KAP, TCMB akışları ve başarı/hata oranları.
                  </p>
                </div>
                <button
                  onClick={() => handleExport('csv', 'activity')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download size={14} /> Aktiviteleri İndir (.CSV)
                </button>
              </div>

              {/* Option 3: Full JSON Telemetry */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition-all">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Database size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Tam Telemetri &amp; Snapshot</h4>
                  <p className="text-xs text-neutral-500">
                    Sistem telemetrisi, tablo yapıları, zaman serisi akışı ve kaynak dağılımını içeren ham JSON verisi.
                  </p>
                </div>
                <button
                  onClick={() => handleExport('json', 'all')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download size={14} /> JSON Snapshot İndir (.JSON)
                </button>
              </div>

            </div>

            {/* Quick Copy Summary Action */}
            <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-purple-400" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Hızlı Rapor: Tek tıkla veritabanı durum özetini panoya kopyalayın.
                </span>
              </div>
              <button
                onClick={copySummaryToClipboard}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-bold transition-opacity hover:opacity-90 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedType === 'summary' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedType === 'summary' ? 'Kopyalandı!' : 'Özeti Panoya Kopyala'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
