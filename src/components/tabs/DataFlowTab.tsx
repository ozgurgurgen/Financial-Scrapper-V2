import React, { useState, useEffect } from 'react';
import { 
  Activity, RefreshCw, AlertCircle, CheckCircle2, 
  Database, ShieldCheck, BarChart3, Terminal, Download, HardDrive
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { DatabaseAnalyticsView } from '../database/DatabaseAnalyticsView';

export default function DataFlowTab() {
  const [activeSubTab, setActiveSubTab] = useState<'ANALYTICS' | 'LOGS'>('ANALYTICS');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<any>(null);

  const fetchLogsAndStats = async () => {
    try {
      const [logsSettled, breakdownSettled] = await Promise.allSettled([
        apiFetch('/api/sync/logs'),
        apiFetch('/api/sync/modules-breakdown')
      ]);

      if (logsSettled.status === 'fulfilled' && logsSettled.value.ok) {
        try {
          const data = await logsSettled.value.json();
          setLogs(data);
        } catch {}
      }
      if (breakdownSettled.status === 'fulfilled' && breakdownSettled.value.ok) {
        try {
          const bData = await breakdownSettled.value.json();
          setBreakdown(bData);
        } catch {}
      }
    } catch (e) {
      console.warn('Data flow fetch stats warning:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndStats();
    const interval = setInterval(fetchLogsAndStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* ─── Top Header & Sub-Tab Switcher ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Activity className="text-purple-500" />
            Veri Akış &amp; Veritabanı Yönetim Konsolu
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            PostgreSQL depolama oranları, veri debisi grafikleri, dışa aktarma (Export) ve canlı terminal logları.
          </p>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('ANALYTICS')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ANALYTICS'
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 size={15} />
              <span>📊 Kullanım &amp; Hareket Grafikleri</span>
            </button>
            <button
              onClick={() => setActiveSubTab('LOGS')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'LOGS'
                  ? 'bg-white dark:bg-neutral-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Terminal size={15} />
              <span>📜 Canlı Terminal &amp; Ham Loglar</span>
            </button>
          </div>

          <button 
            onClick={fetchLogsAndStats} 
            className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Yenile"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ─── TAB 1: VERİTABANI KULLANIM & HAREKET GRAFİKLERİ ─── */}
      {activeSubTab === 'ANALYTICS' && (
        <DatabaseAnalyticsView isDark={true} />
      )}

      {/* ─── TAB 2: CANLI TERMİNAL & HAM LOGLAR ─── */}
      {activeSubTab === 'LOGS' && (
        <div className="space-y-6">
          {/* MODÜL BAZINDA ÖZET ROZETLER */}
          {breakdown && (
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                  <Database size={15} className="text-blue-500" />
                  <span>Veritabanı Modül Dökümü: <strong className="text-blue-600 dark:text-blue-400 font-mono">{(breakdown.summary?.totalRecords || 0).toLocaleString()}</strong> Gerçek Kayıt</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck size={14} />
                  <span>5 Yıllık Veri (%100 Gerçek)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {(breakdown.modules || []).map((m: any) => (
                  <div key={m.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/40">
                    <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">{m.title}</div>
                    <div className="text-lg font-black text-neutral-900 dark:text-white font-mono mt-0.5">
                      {m.recordCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate">{m.itemCount} varlık • 5Y</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terminal Box */}
          <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden font-mono flex flex-col h-[480px] sm:h-[620px] shadow-lg">
            <div className="bg-neutral-900 px-4 py-3 flex items-center justify-between border-b border-neutral-800 text-neutral-400 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <Terminal size={14} className="text-emerald-400" /> Terminal
                </span>
                <span className="text-neutral-500">/api/sync/logs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-medium">Canlı Akış Aktif</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
              {logs.length === 0 ? (
                <div className="text-neutral-600 italic p-4">Henüz kayıt yok. Ayarlar menüsünden servisleri manuel çalıştırabilirsiniz.</div>
              ) : logs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-neutral-900/60 pb-2.5 hover:bg-neutral-900/40 p-1.5 rounded-lg transition-colors">
                  <div className="text-neutral-500 shrink-0 w-44 font-mono text-[11px]">
                    {new Date(log.startedAt).toLocaleString('tr-TR')}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      log.source === 'KAP' ? 'text-amber-400 bg-amber-950/60 border border-amber-800/40' :
                      log.source === 'TEFAS' ? 'text-purple-400 bg-purple-950/60 border border-purple-800/40' :
                      log.source === 'YAHOO' ? 'text-blue-400 bg-blue-950/60 border border-blue-800/40' :
                      log.source === 'TCMB' ? 'text-red-400 bg-red-950/60 border border-red-800/40' :
                      'text-neutral-400 bg-neutral-800/60 border border-neutral-700/40'
                    }`}>
                      [{log.source}]
                    </span>
                    
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-800/30' : 'text-red-400 bg-red-950/30 border border-red-800/30'
                    }`}>
                      {log.status === 'SUCCESS' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {log.status}
                    </span>
                  </div>

                  <div className="text-neutral-300 break-words flex-1 text-[11px]">
                    {log.status === 'SUCCESS' 
                      ? `Senkronizasyon tamamlandı. ${log.recordsProcessed} kayıt işlendi.` 
                      : `Hata: ${log.message}`
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
