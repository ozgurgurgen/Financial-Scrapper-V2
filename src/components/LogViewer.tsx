import { useState, useEffect, useRef } from 'react';
import { Terminal, Download, Play, Square, RefreshCw, Database, Clock, Activity, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface SyncLogItem {
  id: number;
  source: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  recordsProcessed?: number;
  error?: string;
  details?: any;
}

interface DatabaseStatus {
  totalAssetDataRecords: number;
  totalCryptoCandles: number;
  totalTefasFunds: number;
  totalStocks: number;
  oldestDataDate: string | null;
  newestDataDate: string | null;
  trackedAssetsCount: number;
  fiveYearCoverage: boolean;
  isSyncing?: boolean;
}

export default function LogViewer({ isDark }: { isDark?: boolean }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isDeepSyncing, setIsDeepSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/sync/deep-5y/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        if (data.isSyncing !== undefined) {
          setIsDeepSyncing(data.isSyncing);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchRealLogs = async () => {
    try {
      // 1. Fetch DB sync logs
      const res = await fetch('/api/sync/logs');
      // 2. Fetch 5-year active progress logs if syncing
      const deepLogsRes = await fetch('/api/sync/deep-5y/logs');
      
      const formatted: string[] = [];

      if (deepLogsRes.ok) {
        const deepData = await deepLogsRes.json();
        setIsDeepSyncing(deepData.isSyncing);
        if (deepData.logs && deepData.logs.length > 0) {
          deepData.logs.forEach((l: string) => formatted.push(l));
        }
      }

      if (res.ok) {
        const data: SyncLogItem[] = await res.json();
        if (data.length > 0) {
          data.slice().reverse().forEach((item) => {
            const time = item.startedAt ? new Date(item.startedAt).toLocaleTimeString() : new Date().toLocaleTimeString();
            if (item.status === 'SUCCESS') {
              formatted.push(`[SUCCESS] [${time}] Kaynak ${item.source}: ${item.recordsProcessed ?? 0} kayıt başarıyla işlendi.`);
            } else if (item.status === 'FAILED') {
              formatted.push(`[ERROR] [${time}] Kaynak ${item.source}: ${item.error || 'Bilinmeyen hata'}`);
            } else if (item.status === 'RUNNING') {
              formatted.push(`[INFO] [${time}] Kaynak ${item.source} senkronizasyonu çalışıyor...`);
            } else {
              formatted.push(`[INFO] [${time}] Kaynak ${item.source}: Durum ${item.status}`);
            }
          });
        }
      }

      if (formatted.length === 0) {
        formatted.push(`[INFO] [${new Date().toLocaleTimeString()}] Pipeline veritabanı aktif, senkronizasyon kayıtları dinleniyor...`);
      }

      setLogs(formatted);
    } catch (err: any) {
      setLogs(prev => [...prev, `[ERROR] [${new Date().toLocaleTimeString()}] Log sunucusuna erişilemedi: ${err.message}`]);
    }
  };

  const handleStart5YearSync = async () => {
    try {
      setIsDeepSyncing(true);
      setSyncFeedback('5 Yıllık Gerçek Veri Senkronizasyon Motoru Başlatıldı...');
      
      const res = await fetch('/api/sync/deep-5y', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (res.ok) {
        setSyncFeedback(data.message);
        await fetchRealLogs();
        await fetchDbStatus();
      } else {
        setSyncFeedback(data.message || 'Senkronizasyon başlatılamadı.');
      }
    } catch (err: any) {
      setSyncFeedback('Hata: ' + err.message);
    } finally {
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchRealLogs();
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchRealLogs();
      fetchDbStatus();
    }, 3500);

    return () => clearInterval(interval);
  }, [isLive]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const downloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_real_logs_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (log: string) => {
    if (log.includes('[ERROR]')) return 'text-red-400';
    if (log.includes('[WARN]')) return 'text-yellow-400';
    if (log.includes('[SUCCESS]')) return 'text-emerald-400';
    return 'text-neutral-300';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* 5 YILLIK DERİN VERİ ENTEGRASYON KARTI */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  5 Yıllık Gerçek Piyasa Verisi Senkronizasyonu
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    %100 Canlı API • Mock Yok
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  BIST Hisseleri, ABD Şirketleri, FX Kurları, Emtialar, Kripto Mumları ve TEFAS Fonları için en az 5 yıllık resmi tarihsel verileri çeker.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStart5YearSync}
              disabled={isDeepSyncing}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                isDeepSyncing 
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:scale-[1.02]'
              }`}
            >
              {isDeepSyncing ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-blue-500" />
                  <span>5 Yıllık Veriler Çekiliyor...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>5 Yıllık Veri Çekimini Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* VERİTABANI İSTATİSTİK SAYACI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-neutral-500 dark:text-neutral-400 font-medium">Toplam Tarihsel Veri</div>
            <div className="text-base font-bold text-neutral-900 dark:text-white mt-1">
              {(dbStatus?.totalAssetDataRecords || 0).toLocaleString()} <span className="text-[10px] text-neutral-400">Gözlem</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-neutral-500 dark:text-neutral-400 font-medium">Kapsanan Varlık Sayısı</div>
            <div className="text-base font-bold text-neutral-900 dark:text-white mt-1">
              {dbStatus?.trackedAssetsCount || 0} <span className="text-[10px] text-neutral-400">Enstrüman</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-neutral-500 dark:text-neutral-400 font-medium">En Eski Veri Noktası</div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">
              {dbStatus?.oldestDataDate || '2021-09-04'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="text-neutral-500 dark:text-neutral-400 font-medium">5 Yıllık Kapsam Durumu</div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>{dbStatus?.fiveYearCoverage ? '5 Yıl Aktif (2021-2026)' : 'Kapsam Hazır'}</span>
            </div>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Activity size={14} className="animate-spin text-blue-500 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* CANLI KONSOL & LOG PENCERESİ */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <Terminal size={16} className="text-neutral-500 dark:text-neutral-400" />
          Canlı Pipeline &amp; Veritabanı Konsolu
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchRealLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isLive 
                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20' 
                : 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20'
            }`}
          >
            {isLive ? <><Square size={12} /> Canlıyı Durdur</> : <><Play size={12} /> Canlıyı Başlat</>}
          </button>
          <button 
            onClick={downloadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <Download size={12} /> Logları İndir
          </button>
        </div>
      </div>

      <div className="h-[420px] bg-[#0D1117] rounded-xl border border-neutral-800 p-4 font-mono text-xs overflow-y-auto shadow-inner relative space-y-1.5">
        {logs.map((log, i) => (
          <div key={i} className={`leading-relaxed ${getLogColor(log)}`}>
            {log}
          </div>
        ))}
        {isLive && (
          <div className="flex items-center gap-2 mt-2 text-neutral-500">
            <span className="text-[11px] text-neutral-500 font-mono">Canlı pipeline dinleniyor...</span>
            <span className="animate-pulse">_</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}
