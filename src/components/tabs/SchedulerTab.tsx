import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  AlertCircle, 
  Activity, 
  Cpu, 
  Power, 
  ShieldCheck,
  Calendar,
  Layers,
  Database
} from 'lucide-react';

interface TaskInfo {
  id: string;
  name: string;
  cronExpr: string;
  intervalDescription: string;
  category: 'BIST' | 'TEFAS' | 'KAP' | 'CRYPTO' | 'MACRO' | 'FX';
  lastRunAt: string | null;
  lastStatus: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  lastRecordsProcessed: number;
  lastMessage: string | null;
  isRunning: boolean;
  enabled: boolean;
}

export default function SchedulerTab() {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/scheduler/status');
      const data = await res.json();
      if (data && data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err: any) {
      console.error('Scheduler status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (taskId: string) => {
    setRunningTaskId(taskId);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/scheduler/trigger/${taskId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Görev başarıyla tamamlandı!');
      } else {
        setErrorMsg(data.message || 'Görev çalıştırılamadı.');
      }
      await fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Bağlantı hatası.');
    } finally {
      setRunningTaskId(null);
      setTimeout(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
      }, 5000);
    }
  };

  const handleToggle = async (taskId: string, currentEnabled: boolean) => {
    try {
      await fetch(`/api/v1/scheduler/toggle/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      await fetchStatus();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Otomatik Arka Plan Veri Senkronizasyon Motoru (Cron Scheduler)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40">
                Sürekli Aktif
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
              Bu motor, sunucu arka planında kesintisiz çalışarak BIST hisselerini, TEFAS fonlarını, KAP açıklamalarını ve piyasa verilerini zamanlanmış aralıklarla doğrudan PostgreSQL veri tabanına yazar.
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Durumu Yenile</span>
        </button>
      </div>

      {/* Scheduler Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => {
          const isBusy = task.isRunning || runningTaskId === task.id;
          return (
            <div
              key={task.id}
              className={`bg-white dark:bg-neutral-900 rounded-xl border transition-all p-5 shadow-sm space-y-4 ${
                task.enabled
                  ? 'border-neutral-200 dark:border-neutral-800'
                  : 'border-neutral-200/60 dark:border-neutral-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                      task.category === 'BIST'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        : task.category === 'TEFAS'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                        : task.category === 'KAP'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {task.category}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {task.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        {task.intervalDescription}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <button
                  onClick={() => handleToggle(task.id, task.enabled)}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    task.enabled
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                  }`}
                  title={task.enabled ? 'Görevi Durdur' : 'Görevi Başlat'}
                >
                  <Power size={14} />
                  <span className="text-[10px]">{task.enabled ? 'AÇIK' : 'KAPALI'}</span>
                </button>
              </div>

              {/* Status & Last Run Details */}
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Cron İfadesi:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[11px]">
                    {task.cronExpr}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Son Çalışma:</span>
                  <span className="font-mono text-neutral-900 dark:text-white">
                    {task.lastRunAt ? new Date(task.lastRunAt).toLocaleTimeString('tr-TR') : 'Beklemede'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                  <span>Durum:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      task.lastStatus === 'SUCCESS'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : task.lastStatus === 'RUNNING'
                        ? 'text-blue-600 dark:text-blue-400 animate-pulse'
                        : task.lastStatus === 'ERROR'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    {task.lastStatus === 'SUCCESS' && <CheckCircle2 size={12} />}
                    {task.lastStatus === 'RUNNING' && <RefreshCw size={12} className="animate-spin" />}
                    {task.lastStatus}
                  </span>
                </div>
                {task.lastMessage && (
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700/60 pt-1.5 truncate">
                    {task.lastMessage}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleTrigger(task.id)}
                disabled={isBusy}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isBusy ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Veri Tabanına İşleniyor...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    <span>Şimdi Manuel Tetikle & Güncelle</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
