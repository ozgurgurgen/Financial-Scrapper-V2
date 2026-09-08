import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Download,
  Search,
  Filter,
  Terminal,
  Clock,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  Radio,
  Play,
  Pause,
  ArrowUpDown,
  Bug,
  Database,
  Server,
  Globe,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';

export type LogLevel = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type LogModule =
  | 'ALL'
  | 'DATABASE'
  | 'API_GATEWAY'
  | 'YAHOO_BIST'
  | 'BINANCE_CRYPTO'
  | 'TCMB_EVDS'
  | 'TEFAS'
  | 'KAP'
  | 'SCHEDULER'
  | 'AI_SERVICE'
  | 'AUTH'
  | 'TELEGRAM'
  | 'SYSTEM';

interface SystemLogItem {
  id: number;
  level: LogLevel;
  module: string;
  message: string;
  stackTrace?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  clientIp?: string | null;
  statusCode?: number | null;
  contextData?: Record<string, any> | null;
  isResolved: boolean;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  timestamp: string;
}

interface LogStats {
  totalLogs: number;
  fatalCount: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  unresolvedErrors: number;
  last24hCount: number;
  moduleBreakdown: Record<string, number>;
  levelBreakdown: Record<string, number>;
  hourlyDistribution: { hour: string; count: number }[];
}

export default function SystemLogsTab() {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const [streamIntervalMs, setStreamIntervalMs] = useState<number>(3000);

  // Filtreler
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [resolvedFilter, setResolvedFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Genişletilmiş Log Akordeonu
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState<boolean>(false);
  const [testingTrigger, setTestingTrigger] = useState<boolean>(false);

  // Bildirim mesajı
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchLogs = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      try {
        const params: Record<string, any> = {
          page,
          limit: pageSize,
        };

        if (selectedLevel !== 'ALL') params.level = selectedLevel;
        if (selectedModule !== 'ALL') params.module = selectedModule;
        if (resolvedFilter === 'UNRESOLVED') params.isResolved = false;
        if (resolvedFilter === 'RESOLVED') params.isResolved = true;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const [logsRes, statsRes] = await Promise.all([
          axios.get('/api/logs', { params }),
          axios.get('/api/logs/stats'),
        ]);

        if (logsRes.data) {
          setLogs(logsRes.data.logs || []);
          setTotalCount(logsRes.data.total || 0);
          setTotalPages(logsRes.data.totalPages || 1);
        }

        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch system logs:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, pageSize, selectedLevel, selectedModule, resolvedFilter, searchQuery]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Canlı Akış / Otomatik Yenileme Döngüsü
  useEffect(() => {
    if (!isLiveStream) return;

    const interval = setInterval(() => {
      fetchLogs(true);
    }, streamIntervalMs);

    return () => clearInterval(interval);
  }, [isLiveStream, streamIntervalMs, fetchLogs]);

  // Hatayı Çözüldü Olarak İşaretle
  const handleResolve = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResolvingId(id);
    try {
      await axios.post(`/api/logs/resolve/${id}`, { resolvedBy: 'Sistem Yöneticisi' });
      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, isResolved: true, resolvedBy: 'Sistem Yöneticisi' } : l))
      );
      if (stats) {
        setStats({
          ...stats,
          unresolvedErrors: Math.max(0, stats.unresolvedErrors - 1),
        });
      }
      showToast(`Log #${id} çözüldü olarak işaretlendi.`);
    } catch (err: any) {
      alert('İşlem başarısız: ' + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  // Tüm Çözülmemişleri Çöz
  const handleResolveAllVisible = async () => {
    const unresolved = logs.filter((l) => !l.isResolved && (l.level === 'ERROR' || l.level === 'FATAL'));
    if (unresolved.length === 0) {
      showToast('Görüntülenen sayfada çözülecek kritik hata yok.');
      return;
    }

    try {
      for (const item of unresolved) {
        await axios.post(`/api/logs/resolve/${item.id}`, { resolvedBy: 'Toplu Çözüm' });
      }
      showToast(`${unresolved.length} hata çözüldü olarak işaretlendi.`);
      fetchLogs(true);
    } catch (err: any) {
      alert('Toplu işlem hatası: ' + err.message);
    }
  };

  // Logları Temizle
  const handleClearLogs = async () => {
    if (!window.confirm('Tüm sistem log geçmişini temizlemek istediğinizden emin misiniz?')) {
      return;
    }

    setClearing(true);
    try {
      await axios.post('/api/logs/clear');
      setLogs([]);
      setTotalCount(0);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              totalLogs: 0,
              fatalCount: 0,
              errorCount: 0,
              warnCount: 0,
              infoCount: 0,
              unresolvedErrors: 0,
              last24hCount: 0,
              moduleBreakdown: {},
              levelBreakdown: {},
              hourlyDistribution: [],
            }
          : null
      );
      showToast('Tüm log kayıtları başarıyla temizlendi.');
    } catch (err: any) {
      alert('Temizleme hatası: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  // Dışa Aktarma (Export)
  const handleExport = (format: 'json' | 'csv') => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (selectedLevel !== 'ALL') params.set('level', selectedLevel);
    if (selectedModule !== 'ALL') params.set('module', selectedModule);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    window.open(`/api/logs/export?${params.toString()}`, '_blank');
    showToast(`${format.toUpperCase()} dışa aktarma dosyası indiriliyor...`);
  };

  // Test Logu Oluştur
  const handleTriggerTestLog = async (level: 'WARN' | 'ERROR' | 'FATAL') => {
    setTestingTrigger(true);
    try {
      const messages = {
        WARN: 'Test Uyarısı: BIST hisse senkronizasyonunda geçici 320ms gecikme algılandı.',
        ERROR: 'Test Hatası: TEFAS fon servisi soket zaman aşımına uğradı (EconnReset).',
        FATAL: 'Test Kritik Hatası: Veritabanı bağlantı havuzu tükenme eşiğine ulaştı.',
      };

      const modules: Record<string, string> = {
        WARN: 'YAHOO_BIST',
        ERROR: 'TEFAS',
        FATAL: 'DATABASE',
      };

      await axios.post('/api/logs/test', {
        level,
        module: modules[level],
        message: messages[level],
      });

      showToast(`Yeni ${level} logu tetiklendi ve veritabanına yazıldı.`);
      fetchLogs(true);
    } catch (err: any) {
      alert('Test tetikleme hatası: ' + err.message);
    } finally {
      setTestingTrigger(false);
    }
  };

  // Stack trace kopyala
  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Seviye Rozeti
  const renderLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'FATAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-xs animate-pulse">
            <AlertOctagon size={13} /> FATAL
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertOctagon size={13} /> ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle size={13} /> WARN
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Info size={13} /> INFO
          </span>
        );
      case 'DEBUG':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border border-neutral-500/30">
            <Bug size={13} /> DEBUG
          </span>
        );
      default:
        return null;
    }
  };

  // Modül Rozeti
  const renderModuleBadge = (mod: string) => {
    const moduleColors: Record<string, string> = {
      DATABASE: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      API_GATEWAY: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      YAHOO_BIST: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      BINANCE_CRYPTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      TCMB_EVDS: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      TEFAS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      KAP: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      SCHEDULER: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      AI_SERVICE: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      AUTH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      CLIENT_UI: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      BROWSER: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
      SYSTEM: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
    };

    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
          moduleColors[mod] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20'
        }`}
      >
        {mod}
      </span>
    );
  };

  // Zaman Formatı
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Bildirimi */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 border border-neutral-700 dark:border-neutral-200"
          >
            <CheckCircle2 size={16} className="text-emerald-500" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Başlık ve Üst Eylemler */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Kapsamlı Sistem & Hata Loglama Merkezi
                {isLiveStream && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    CANLI AKIŞ
                  </span>
                )}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Tüm API istekleri, veri bağdaştırıcıları, asenkron kuyruklar ve veritabanı istisnalarının kalıcı denetim kaydı.
              </p>
            </div>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Canlı Akış Geçişi */}
          <button
            onClick={() => setIsLiveStream((prev) => !prev)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isLiveStream
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {isLiveStream ? <Pause size={14} /> : <Play size={14} />}
            {isLiveStream ? 'Canlı Akış: Açık' : 'Canlı Akış: Duraklatıldı'}
          </button>

          {/* Yenile Butonu */}
          <button
            onClick={() => fetchLogs(false)}
            disabled={loading || refreshing}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors"
            title="Şimdi Yenile"
          >
            <RefreshCw size={16} className={refreshing || loading ? 'animate-spin' : ''} />
          </button>

          {/* Test Logu Tetikle Menüsü */}
          <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800 text-xs">
            <span className="px-2.5 py-2 text-neutral-500 font-medium">Test:</span>
            <button
              onClick={() => handleTriggerTestLog('WARN')}
              disabled={testingTrigger}
              className="px-2.5 py-2 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium transition-colors border-l border-neutral-200 dark:border-neutral-700"
            >
              Uyarı (WARN)
            </button>
            <button
              onClick={() => handleTriggerTestLog('ERROR')}
              disabled={testingTrigger}
              className="px-2.5 py-2 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium transition-colors border-l border-neutral-200 dark:border-neutral-700"
            >
              Hata (ERROR)
            </button>
          </div>

          {/* Dışa Aktar */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> CSV
            </button>
          </div>

          {/* Temizle */}
          <button
            onClick={handleClearLogs}
            disabled={clearing}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900/50 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} /> Temizle
          </button>
        </div>
      </div>

      {/* Özet Metrik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Toplam Log */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Toplam Kayıt</span>
            <Database size={16} className="text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {stats?.totalLogs.toLocaleString('tr-TR') || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Kalıcı PostgreSQL DB</div>
        </div>

        {/* Çözülmemiş Hatalar */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Aksiyon Bekleyen</span>
            <AlertOctagon size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {stats?.unresolvedErrors || 0}
          </div>
          <div className="text-[11px] text-rose-500/80 mt-1">Çözülmemiş Kritik Hata</div>
        </div>

        {/* Kritik (FATAL / ERROR) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Hatalar (ERROR)</span>
            <AlertOctagon size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {(stats?.errorCount || 0) + (stats?.fatalCount || 0)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Kritik & İstisna</div>
        </div>

        {/* Uyarılar (WARN) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Uyarılar (WARN)</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {stats?.warnCount || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Gecikme & Tekrar</div>
        </div>

        {/* Bilgilendirme (INFO) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Bilgi (INFO)</span>
            <Info size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {stats?.infoCount || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Sistem Olayları</div>
        </div>

        {/* Son 24 Saat */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Son 24 Saat</span>
            <Clock size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {stats?.last24hCount || 0}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Yeni Kayıt</div>
        </div>
      </div>

      {/* 24 Saatlik Hata Dağılım Grafiği */}
      {stats && stats.hourlyDistribution && stats.hourlyDistribution.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Son 24 Saatlik Log ve Hata Aktivitesi Dağılımı
              </h2>
              <p className="text-xs text-neutral-500">Saat başı kaydedilen sistem olayları</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Olay Hacmi
              </span>
            </div>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourlyDistribution} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-neutral-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg border border-neutral-700">
                          <span className="font-semibold">{payload[0].payload.hour}</span>: {payload[0].value} olay
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {stats.hourlyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 10 ? '#e11d48' : entry.count > 0 ? '#f43f5e' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filtre ve Arama Araç Çubuğu */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Arama Kutusu */}
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Mesaj, URL yolu veya modül ara..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          {/* Seviye Filtresi */}
          <div>
            <select
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
            >
              <option value="ALL">Tüm Seviyeler (ALL)</option>
              <option value="FATAL">FATAL (Kritik Kesinti)</option>
              <option value="ERROR">ERROR (Hata)</option>
              <option value="WARN">WARN (Uyarı)</option>
              <option value="INFO">INFO (Bilgi)</option>
              <option value="DEBUG">DEBUG (Hata Ayıklama)</option>
            </select>
          </div>

          {/* Modül Filtresi */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
            >
              <option value="ALL">Tüm Modüller (ALL)</option>
              <option value="DATABASE">DATABASE (PostgreSQL / Cloud SQL)</option>
              <option value="API_GATEWAY">API_GATEWAY (REST API & Auth)</option>
              <option value="YAHOO_BIST">YAHOO_BIST (625+ Hisse Fiyat)</option>
              <option value="TEFAS">TEFAS (Yatırım Fonları & Portföy)</option>
              <option value="KAP">KAP (Şirket & Bildirimler)</option>
              <option value="BINANCE_CRYPTO">BINANCE_CRYPTO (Kripto & On-Chain)</option>
              <option value="TCMB_EVDS">TCMB_EVDS (Döviz & Faiz)</option>
              <option value="SCHEDULER">SCHEDULER (Zamanlayıcı Görevleri)</option>
              <option value="AI_SERVICE">AI_SERVICE (Gemini LLM)</option>
              <option value="AUTH">AUTH (Kimlik Doğrulama)</option>
              <option value="CLIENT_UI">CLIENT_UI (React & Frontend Arayüz)</option>
              <option value="BROWSER">BROWSER (Tarayıcı Konsol Hataları)</option>
              <option value="SYSTEM">SYSTEM (Node.js & Sunucu)</option>
            </select>
          </div>

          {/* Çözüm Durumu Filtresi */}
          <div>
            <select
              value={resolvedFilter}
              onChange={(e) => {
                setResolvedFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
            >
              <option value="ALL">Çözüm Durumu: Hepsi</option>
              <option value="UNRESOLVED">Sadece Çözülmemişler</option>
              <option value="RESOLVED">Çözülenler</option>
            </select>
          </div>
        </div>

        {/* Alt Bilgi Çubuğu ve Hızlı Toplu Çözüm */}
        <div className="flex flex-wrap items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div>
            Toplam <strong>{totalCount}</strong> kayıttan{' '}
            <strong>{Math.min(totalCount, (page - 1) * pageSize + 1)}</strong> -{' '}
            <strong>{Math.min(totalCount, page * pageSize)}</strong> arası gösteriliyor.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResolveAllVisible}
              className="text-rose-600 dark:text-rose-400 hover:underline font-medium flex items-center gap-1"
            >
              <CheckCheck size={14} /> Bu Sayfadaki Hataları Çözüldü İşaretle
            </button>
            <div className="flex items-center gap-1">
              <span>Sayfa Başına:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Log Tablosu & Liste */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-rose-500" />
            <p className="text-sm">Log kayıtları yükleniyor...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 dark:text-neutral-400">
            <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-500" />
            <p className="text-base font-medium text-neutral-800 dark:text-neutral-200">Kriterlere uygun log kaydı bulunamadı</p>
            <p className="text-xs text-neutral-400 mt-1">Filtreleri sıfırlayabilir veya test uyarısı tetikleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {logs.map((item) => {
              const isExpanded = expandedLogId === item.id;
              const hasStack = Boolean(item.stackTrace);
              const hasContext = Boolean(item.contextData && Object.keys(item.contextData).length > 0);

              return (
                <div
                  key={item.id}
                  className={`transition-colors ${
                    item.level === 'FATAL'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/60 dark:hover:bg-rose-950/30'
                      : item.level === 'ERROR' && !item.isResolved
                      ? 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
                      : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  {/* Satır Başlığı */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer"
                  >
                    {/* Sol Kısım: Rozetler, Modül, Mesaj */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="pt-0.5 shrink-0">{renderLevelBadge(item.level)}</div>
                      <div className="pt-0.5 shrink-0">{renderModuleBadge(item.module)}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 break-words">
                            {item.message}
                          </span>
                          {item.statusCode && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                item.statusCode >= 500
                                  ? 'bg-rose-500/20 text-rose-600'
                                  : item.statusCode >= 400
                                  ? 'bg-amber-500/20 text-amber-600'
                                  : 'bg-emerald-500/20 text-emerald-600'
                              }`}
                            >
                              HTTP {item.statusCode}
                            </span>
                          )}
                          {item.requestMethod && item.requestPath && (
                            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                              {item.requestMethod} {item.requestPath}
                            </span>
                          )}
                        </div>

                        {/* Ek Detay Satırı */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={11} /> {formatDate(item.timestamp)} {formatTime(item.timestamp)}
                          </span>
                          {item.clientIp && <span>IP: {item.clientIp}</span>}
                          {item.isResolved ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                              <CheckCircle2 size={11} /> Çözüldü ({item.resolvedBy || 'Admin'})
                            </span>
                          ) : item.level === 'ERROR' || item.level === 'FATAL' ? (
                            <span className="text-rose-500 font-semibold">Çözülmedi</span>
                          ) : null}
                          {(hasStack || hasContext) && (
                            <span className="text-blue-500 font-medium hover:underline">
                              {isExpanded ? 'Detayları Gizle' : 'Detayları İncele'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sağ Kısım: Aksiyon Butonları & Akordeon Ok */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {!item.isResolved && (item.level === 'ERROR' || item.level === 'FATAL') && (
                        <button
                          onClick={(e) => handleResolve(item.id, e)}
                          disabled={resolvingId === item.id}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Çözüldü olarak işaretle"
                        >
                          <CheckCircle2 size={13} /> {resolvingId === item.id ? 'İşleniyor...' : 'Çözüldü'}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(
                            JSON.stringify(item, null, 2),
                            item.id
                          );
                        }}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                        title="JSON Olarak Kopyala"
                      >
                        {copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      <div className="text-neutral-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Genişletilmiş Akordeon Paneli */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-4 pt-1 bg-neutral-900 text-neutral-100 text-xs font-mono border-t border-neutral-800 space-y-3"
                      >
                        {/* Stack Trace */}
                        {item.stackTrace && (
                          <div>
                            <div className="flex items-center justify-between text-neutral-400 pb-1 border-b border-neutral-800 mb-1.5 font-semibold">
                              <span>HATA İZLEME (STACK TRACE):</span>
                              <button
                                onClick={() => copyToClipboard(item.stackTrace || '', item.id + 100000)}
                                className="hover:text-white flex items-center gap-1"
                              >
                                <Copy size={12} /> Kopyala
                              </button>
                            </div>
                            <pre className="p-3 bg-black/50 rounded-lg overflow-x-auto text-[11px] leading-relaxed text-rose-300 border border-rose-900/30 whitespace-pre-wrap">
                              {item.stackTrace}
                            </pre>
                          </div>
                        )}

                        {/* Context Data JSON */}
                        {hasContext && (
                          <div>
                            <div className="flex items-center justify-between text-neutral-400 pb-1 border-b border-neutral-800 mb-1.5 font-semibold">
                              <span>BAĞLAM VERİSİ (CONTEXT METADATA):</span>
                            </div>
                            <pre className="p-3 bg-black/50 rounded-lg overflow-x-auto text-[11px] text-cyan-300 border border-cyan-900/30">
                              {JSON.stringify(item.contextData, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Ham Log Özeti */}
                        <div className="flex flex-wrap gap-4 text-[11px] text-neutral-400 pt-2 border-t border-neutral-800">
                          <span>Log ID: #{item.id}</span>
                          <span>Timestamp: {new Date(item.timestamp).toISOString()}</span>
                          {item.requestPath && <span>Path: {item.requestPath}</span>}
                          {item.statusCode && <span>Status: {item.statusCode}</span>}
                          {item.clientIp && <span>Client IP: {item.clientIp}</span>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Sayfalama Altlığı */}
        {totalPages > 1 && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-50"
            >
              ← Önceki Sayfa
            </button>
            <span className="text-neutral-600 dark:text-neutral-400">
              Sayfa <strong>{page}</strong> / <strong>{totalPages}</strong>
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 font-medium disabled:opacity-50"
            >
              Sonraki Sayfa →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
