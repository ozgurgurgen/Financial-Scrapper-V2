import { useState, useEffect, useRef, useCallback } from 'react';
import { OfficeSimEvent, DepartmentType, EventStatus } from '../../services/AppEventBus';
import { DEPARTMENTS, DepartmentConfig, OFFICE_EVENT_MAP } from '../../config/officeEventMap';
import { OfficeStageView } from './OfficeStageView';
import { DatabaseAnalyticsModal } from '../database/DatabaseAnalyticsModal';
import { 
  Building2, 
  Activity, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Flame, 
  Coffee, 
  FileText, 
  Play, 
  Trash2, 
  Filter, 
  Pause, 
  TrendingUp, 
  ChevronRight,
  Database,
  ArrowUpRight,
  Sparkles,
  LayoutGrid,
  Clapperboard,
  HardDrive
} from 'lucide-react';

interface DepartmentRuntimeState {
  currentStatus: EventStatus;
  lastEventTime: number;
  lastEventDetail: string;
  activeAnimation: string | null;
  processedCount: number;
  errorCount: number;
}

export default function LiveOfficeTab() {
  // Görev 1: Görünüm Değiştirici (Toggle) - Panel vs Sahne (localStorage hatırlar)
  const [viewMode, setViewMode] = useState<'panel' | 'stage'>(() => {
    const saved = localStorage.getItem('fp_office_view_mode');
    return saved === 'stage' ? 'stage' : 'panel';
  });

  const [events, setEvents] = useState<OfficeSimEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [triggeringDept, setTriggeringDept] = useState<DepartmentType | null>(null);
  const [activeFlyingEvent, setActiveFlyingEvent] = useState<{
    id: string;
    fromDept: DepartmentType;
    toDept: DepartmentType;
    detail: string;
  } | null>(null);
  const [isDbAnalyticsOpen, setIsDbAnalyticsOpen] = useState<boolean>(false);

  // Sync viewMode to localStorage
  const handleToggleViewMode = (mode: 'panel' | 'stage') => {
    setViewMode(mode);
    localStorage.setItem('fp_office_view_mode', mode);
  };

  // Department real-time statuses
  const [deptStates, setDeptStates] = useState<Record<DepartmentType, DepartmentRuntimeState>>({
    BORSA: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    AMERIKA: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    ETF_FONLARI: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    KAP: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    MERKEZ_BANKASI: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    ARSIV: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    BACKFILL: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    KRIPTO: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    HALKA_ARZ: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
    HABERLER: { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: 'Hazırda bekliyor', activeAnimation: null, processedCount: 0, errorCount: 0 },
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<boolean>(true);

  // Handle incoming event
  const processEvent = useCallback((event: OfficeSimEvent) => {
    if (!isPaused) {
      setEvents((prev) => {
        const next = [event, ...prev.slice(0, 199)]; // Keep last 200 events in memory
        return next;
      });
    }

    // Determine target department and animation
    const dept = event.department;
    const mapping = OFFICE_EVENT_MAP[event.type];
    const anim = mapping?.animation || (event.status === 'ERROR' ? 'red_box_drop' : 'glow_screen');

    // Trigger visual desk activity
    setDeptStates((prev) => {
      const current = prev[dept] || { currentStatus: 'IDLE', lastEventTime: 0, lastEventDetail: '', activeAnimation: null, processedCount: 0, errorCount: 0 };
      return {
        ...prev,
        [dept]: {
          ...current,
          currentStatus: event.status,
          lastEventTime: Date.now(),
          lastEventDetail: event.detail,
          activeAnimation: anim,
          processedCount: current.processedCount + 1,
          errorCount: event.status === 'ERROR' ? current.errorCount + 1 : current.errorCount
        }
      };
    });

    // Check if event travels between departments (Görev 4: DB_WRITE_BATCH_SUCCESS ve veri tamamlama)
    if (
      event.type === 'DB_WRITE_BATCH_SUCCESS' || 
      event.type === 'DATA_FETCH_SUCCESS' || 
      event.type === 'ASSET_MATCH_SUCCESS' || 
      event.type === 'PDR_PARSE_COMPLETED'
    ) {
      setActiveFlyingEvent({
        id: event.id,
        fromDept: dept === 'ARSIV' ? 'BORSA' : dept,
        toDept: 'ARSIV',
        detail: event.detail
      });
      setTimeout(() => {
        setActiveFlyingEvent(null);
      }, 1400);
    }

    // Reset busy/active animation to IDLE after timeout if not on cooldown
    if (event.status !== 'COOLDOWN') {
      setTimeout(() => {
        setDeptStates((prev) => {
          const s = prev[dept];
          if (!s || s.lastEventTime > Date.now() - 3000) return prev;
          return {
            ...prev,
            [dept]: {
              ...s,
              currentStatus: 'IDLE',
              activeAnimation: null
            }
          };
        });
      }, mapping?.durationMs || 3000);
    }
  }, [isPaused]);

  // Connect to SSE Endpoint with reconnection resilience
  useEffect(() => {
    let reconnectTimeout: any = null;
    let isMounted = true;

    const connectSSE = () => {
      if (!isMounted) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/v1/events/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      es.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'INITIAL_STATE' && Array.isArray(data.events)) {
            setEvents(data.events);
            // Initialize department counts
            data.events.forEach((ev: OfficeSimEvent) => {
              const d = ev.department;
              if (d) {
                setDeptStates((prev) => ({
                  ...prev,
                  [d]: {
                    ...prev[d],
                    processedCount: (prev[d]?.processedCount || 0) + 1,
                    errorCount: ev.status === 'ERROR' ? (prev[d]?.errorCount || 0) + 1 : (prev[d]?.errorCount || 0),
                    lastEventDetail: ev.detail
                  }
                }));
              }
            });
          } else if (data.id && data.type) {
            processEvent(data as OfficeSimEvent);
          }
        } catch (err) {
          console.error('[LiveOffice] Error parsing SSE payload:', err);
        }
      };

      es.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // Browser's EventSource auto-reconnects, but if disconnected in background, retry explicitly after 3s
        if (es.readyState === EventSource.CLOSED) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      };
    };

    connectSSE();

    // Reconnect when tab returns from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED)) {
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [processEvent]);

  // Test trigger a real background sync or scheduler job
  const triggerManualAction = async (dept: DepartmentType, label: string) => {
    if (triggeringDept) return; // Prevent double-clicks
    setTriggeringDept(dept);
    try {
      if (dept === 'BORSA') {
        await fetch('/api/sync/trigger/YAHOO', { method: 'POST' });
      } else if (dept === 'AMERIKA') {
        await fetch('/api/v1/us-stocks/sync', { method: 'POST' });
      } else if (dept === 'ETF_FONLARI') {
        await fetch('/api/v1/us-etfs/sync', { method: 'POST' });
      } else if (dept === 'MERKEZ_BANKASI') {
        await fetch('/api/sync/trigger/TCMB', { method: 'POST' });
      } else if (dept === 'KAP') {
        await fetch('/api/v1/scheduler/trigger/kap_disclosures', { method: 'POST' });
      } else if (dept === 'BACKFILL') {
        await fetch('/api/v1/scheduler/trigger/weekend_backfill_safe', { method: 'POST' });
      } else if (dept === 'KRIPTO') {
        await fetch('/api/v1/scheduler/trigger/crypto_candles', { method: 'POST' });
      } else if (dept === 'HALKA_ARZ') {
        await fetch('/api/v1/scheduler/trigger/ipo_tracking', { method: 'POST' });
      } else if (dept === 'HABERLER') {
        await fetch('/api/v1/scheduler/trigger/news_tracking', { method: 'POST' });
      } else {
        await fetch('/api/v1/scheduler/trigger/bist_quotes', { method: 'POST' });
      }
    } catch (err) {
      console.warn('[LiveOffice] Manual trigger error:', err);
    } finally {
      setTimeout(() => {
        setTriggeringDept(null);
      }, 1000);
    }
  };

  const filteredEvents = selectedDeptFilter === 'ALL' 
    ? events 
    : events.filter(e => e.department === selectedDeptFilter);

  const departmentsList: DepartmentConfig[] = Object.values(DEPARTMENTS);

  return (
    <div id="live-office-container" className="w-full max-w-[2560px] 3xl:max-w-full mx-auto p-2 sm:p-4 lg:p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500 text-2xl shadow-xs">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Canlı Ofis Simülasyonu
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isConnected 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {isConnected ? 'SSE CANLI BAĞLI' : 'BAĞLANTI BEKLENİYOR'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Sistem mikro servislerinin, scraping robotlarının ve Yapay Zeka (AI) motorunun anlık ofis aktivite simülasyonu
            </p>
          </div>
        </div>

        {/* Action Controls & View Toggle (Görev 1: Panel vs Sahne Seçici) */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* View Mode Toggle Pill */}
          <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 shadow-xs">
            <button
              id="btn-view-stage"
              onClick={() => handleToggleViewMode('stage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'stage'
                  ? 'bg-white dark:bg-neutral-900 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Clapperboard size={14} />
              <span>🎬 Sahne Görünümü</span>
            </button>
            <button
              id="btn-view-panel"
              onClick={() => handleToggleViewMode('panel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'panel'
                  ? 'bg-white dark:bg-neutral-900 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              <span>📊 Panel Görünümü</span>
            </button>
          </div>

          <button
            id="btn-open-db-analytics"
            onClick={() => setIsDbAnalyticsOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition-all cursor-pointer"
          >
            <Database size={14} />
            <span>DB Analitiği &amp; Export</span>
          </button>

          <button
            id="toggle-pause-btn"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-colors ${
              isPaused 
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
            {isPaused ? 'Akışı Sürdür' : 'Akışı Duraklat'}
          </button>

          <button
            id="clear-logs-btn"
            onClick={() => setEvents([])}
            className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            Temizle
          </button>
        </div>
      </div>

      {/* Main Content Layout based on View Mode */}
      {viewMode === 'stage' ? (
        /* SAHNE GÖRÜNÜMÜ: 4K UYUMLU TAM GENİŞLİK 2D OYUN ALANI */
        <div className="space-y-6">
          {/* 2D Retro Oyun Sahnesi (Menüye kadar genişler) */}
          <div className="w-full shadow-lg rounded-2xl overflow-hidden">
            <OfficeStageView
              deptStates={deptStates}
              onTriggerAction={triggerManualAction}
              triggeringDept={triggeringDept}
              activePacketTrigger={
                activeFlyingEvent
                  ? { from: activeFlyingEvent.fromDept, to: activeFlyingEvent.toDept, id: activeFlyingEvent.id }
                  : null
              }
              onOpenDbAnalytics={() => setIsDbAnalyticsOpen(true)}
            />
          </div>

          {/* Alt Bilgi & Gerçek Zamanlı SSE Terminal Çubuğu */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Sol: Departman Durum Özetleri (4 Cols) */}
            <div className="xl:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
                  <Building2 size={18} className="text-cyan-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Departman Durumları
                  </h2>
                </div>

                <div className="space-y-2.5">
                  {departmentsList.map((dept) => {
                    const state = deptStates[dept.id] || { 
                      currentStatus: 'IDLE', 
                      lastEventTime: 0, 
                      lastEventDetail: 'Hazır', 
                      activeAnimation: null, 
                      processedCount: 0, 
                      errorCount: 0 
                    };
                    const isBusy = state.currentStatus === 'BUSY';
                    const isError = state.currentStatus === 'ERROR';

                    return (
                      <div 
                        key={dept.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{dept.avatarIcon}</span>
                          <div>
                            <div className="text-xs font-bold text-neutral-900 dark:text-white">{dept.title}</div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{dept.characterRole}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-emerald-500">
                            {state.processedCount} işlendi
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isBusy ? 'bg-cyan-500/20 text-cyan-500 animate-pulse' :
                            isError ? 'bg-red-500/20 text-red-500' :
                            'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                          }`}>
                            {state.currentStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <span>⚡ Toplam İşlem: {(Object.values(deptStates) as DepartmentRuntimeState[]).reduce((a, s) => a + (s.processedCount || 0), 0)}</span>
                <span className="font-mono text-[11px]">SSE Active</span>
              </div>
            </div>

            {/* Sağ: Canlı Olay Terminali (8 Cols) */}
            <div className="xl:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col h-[380px]">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Canlı Olay Günlüğü (SSE Stream)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setSelectedDeptFilter('ALL')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        selectedDeptFilter === 'ALL' ? 'bg-cyan-500 text-white font-bold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Tümü
                    </button>
                    {departmentsList.map(d => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDeptFilter(d.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                          selectedDeptFilter === d.id ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span>{d.avatarIcon}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                    {filteredEvents.length} Olay
                  </span>
                </div>
              </div>

              {/* Event List Stream */}
              <div 
                ref={logContainerRef}
                className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700"
              >
                {filteredEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-6">
                    <Clock size={28} className="opacity-40 mb-2" />
                    <p className="font-sans font-medium text-xs">Olay akışı bekleniyor</p>
                  </div>
                ) : (
                  filteredEvents.map((ev) => {
                    const deptConf = DEPARTMENTS[ev.department];
                    const timeStr = new Date(ev.timestamp).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <div
                        key={ev.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                          ev.status === 'ERROR'
                            ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                            : ev.status === 'COOLDOWN'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                            : ev.status === 'BUSY'
                            ? 'bg-cyan-500/5 border-cyan-500/20 text-neutral-800 dark:text-neutral-200'
                            : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{deptConf?.avatarIcon || '📌'}</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {ev.actor}
                          </span>
                          <span className="text-neutral-400">•</span>
                          <span className="font-sans text-xs font-medium truncate max-w-md">
                            {ev.detail}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-neutral-400">{timeStr}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ev.status === 'ERROR' 
                              ? 'bg-red-500 text-white' 
                              : ev.status === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                          }`}>
                            {ev.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PANEL GÖRÜNÜMÜ (Mevcut 2-Sütunlu Tasarım Korundu) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Panel Görünümü (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              
              {/* Header & Subtitle */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-cyan-500" />
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Operasyon Kat Planı & Masalar
                  </h2>
                </div>
                <span className="text-xs text-neutral-400">
                  6 Aktif Departman
                </span>
              </div>

              {/* Flying Event Animation Overlay */}
              {activeFlyingEvent && (
                <div className="absolute top-4 right-4 z-20 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg animate-bounce flex items-center gap-1.5 border border-indigo-400">
                  <FileText size={12} />
                  <span>Veri Paketi ➔ Arşiv Kasasına Aktarılıyor</span>
                </div>
              )}

              {/* Office Desks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {departmentsList.map((dept) => {
                  const state = deptStates[dept.id] || { 
                    currentStatus: 'IDLE', 
                    lastEventTime: 0, 
                    lastEventDetail: 'Hazır', 
                    activeAnimation: null, 
                    processedCount: 0, 
                    errorCount: 0 
                  };
                  
                  const isBusy = state.currentStatus === 'BUSY';
                  const isError = state.currentStatus === 'ERROR';
                  const isCooldown = state.currentStatus === 'COOLDOWN';
                  const isSuccess = state.currentStatus === 'SUCCESS';

                  return (
                    <div
                      key={dept.id}
                      id={`desk-${dept.id.toLowerCase()}`}
                      className={`relative p-4 rounded-xl border transition-all duration-300 ${
                        isBusy 
                          ? `${dept.primaryColor} ring-2 ring-cyan-500/50 shadow-md` 
                          : isError 
                          ? 'border-red-500/50 bg-red-500/5 ring-2 ring-red-500/30' 
                          : isCooldown 
                          ? 'border-amber-500/50 bg-amber-500/5' 
                          : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      {/* Top Desk Header */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="text-2xl select-none p-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                            {dept.avatarIcon}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                              {dept.title}
                            </h3>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              {dept.characterRole}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1 ${
                          isBusy 
                            ? 'bg-cyan-500/20 text-cyan-500 border-cyan-500/40 animate-pulse' 
                            : isError 
                            ? 'bg-red-500/20 text-red-500 border-red-500/40' 
                            : isCooldown 
                            ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' 
                            : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500 border-neutral-300 dark:border-neutral-700'
                        }`}>
                          {isBusy && <Zap size={10} className="animate-spin" />}
                          {isError && <AlertTriangle size={10} />}
                          {isCooldown && <Coffee size={10} />}
                          {isSuccess && <CheckCircle2 size={10} />}
                          {state.currentStatus}
                        </span>
                      </div>

                      {/* Desk Visual / Computer Screen */}
                      <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 text-xs mb-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                          <span>MASA: {dept.deskLabel}</span>
                          {isBusy && (
                            <span className="text-cyan-500 animate-pulse font-bold flex items-center gap-1">
                              <Flame size={12} /> ÇALIŞIYOR
                            </span>
                          )}
                          {isCooldown && (
                            <span className="text-amber-500 flex items-center gap-1">
                              <Coffee size={12} /> KOTA MOLASI
                            </span>
                          )}
                        </div>
                        
                        {/* Active Event Detail Message */}
                        <p className={`text-xs font-medium truncate ${
                          isError ? 'text-red-500' : isBusy ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'
                        }`}>
                          {state.lastEventDetail || 'Beklemede...'}
                        </p>
                      </div>

                      {/* Footer Metrics & Trigger Button */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50 dark:border-neutral-800/60 text-xs">
                        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                          <span>İşlem: <strong className="text-neutral-900 dark:text-white">{state.processedCount}</strong></span>
                          {state.errorCount > 0 && (
                            <span className="text-red-500 font-semibold">Hata: {state.errorCount}</span>
                          )}
                        </div>

                        <button
                          id={`btn-trigger-${dept.id.toLowerCase()}`}
                          onClick={() => triggerManualAction(dept.id, dept.title)}
                          disabled={triggeringDept === dept.id}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                            triggeringDept === dept.id
                              ? 'bg-cyan-500/20 text-cyan-600 border-cyan-500/40 cursor-wait'
                              : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                          }`}
                          title="Bu servisi doğrudan çalıştır"
                        >
                          {triggeringDept === dept.id ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                              İşleniyor
                            </>
                          ) : (
                            <>
                              <Play size={10} /> Başlat
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Visual Floor Info Legend */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" /> Meşgul / Veri Çekiyor
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tamamlandı
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> AI Kota Beklemesi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Hata
                  </span>
                </div>
                <span className="text-neutral-400 font-mono text-[11px]">
                  Port: 3000 | SSE EventBus
                </span>
              </div>
            </div>
          </div>

        {/* RIGHT COLUMN: Canlı Terminal & Event Stream (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col h-[640px]">
            
            {/* Terminal Header & Filter */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Canlı Olay Günlüğü (SSE)
                </h2>
              </div>
              <span className="text-xs font-mono text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                {filteredEvents.length} Olay
              </span>
            </div>

            {/* Department Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 custom-scrollbar">
              <button
                onClick={() => setSelectedDeptFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedDeptFilter === 'ALL'
                    ? 'bg-cyan-500 text-white font-bold'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                Tümü
              </button>
              {departmentsList.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDeptFilter(d.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedDeptFilter === d.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  <span>{d.avatarIcon}</span>
                  <span>{d.title.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Event List Stream */}
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700"
            >
              {filteredEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-6">
                  <Clock size={32} className="opacity-40 mb-2" />
                  <p className="font-sans font-medium">Henüz olay gerçekleşmedi</p>
                  <p className="text-[11px] font-sans text-neutral-500 mt-1">
                    Sol paneldeki masaların altındaki "Tetikle" butonuna basarak anlık olay akışı başlatabilirsiniz.
                  </p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const deptConf = DEPARTMENTS[ev.department];
                  const timeStr = new Date(ev.timestamp).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <div
                      key={ev.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        ev.status === 'ERROR'
                          ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                          : ev.status === 'COOLDOWN'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                          : ev.status === 'BUSY'
                          ? 'bg-cyan-500/5 border-cyan-500/20 text-neutral-800 dark:text-neutral-200'
                          : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{deptConf?.avatarIcon || '📌'}</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {ev.actor}
                          </span>
                          <span className="text-neutral-400">• {ev.department}</span>
                        </div>
                        <span className="font-mono text-[10px]">{timeStr}</span>
                      </div>

                      <p className="font-sans text-xs font-medium leading-snug">
                        {ev.detail}
                      </p>

                      {/* Event Type & Status Badge */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-200/40 dark:border-neutral-700/40 text-[10px]">
                        <span className="text-neutral-400 font-mono">
                          {ev.type}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                          ev.status === 'ERROR' 
                            ? 'bg-red-500 text-white' 
                            : ev.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Stream Footer */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Radio size={12} className="text-cyan-500 animate-pulse" />
                Gerçek Zamanlı SSE Kanalı
              </span>
              <span>Buffer: 200 Olay</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Veritabanı Kullanım & Hareket Grafikleri Modal */}
      <DatabaseAnalyticsModal
        isOpen={isDbAnalyticsOpen}
        onClose={() => setIsDbAnalyticsOpen(false)}
      />
    </div>
  );
}
