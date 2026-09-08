import React, { useState } from 'react';
import { 
  Database, X, Cloud, Server, CheckCircle2, XCircle, RefreshCw, 
  ArrowDown, ArrowUp, ArrowLeftRight, AlertTriangle, ShieldCheck, Layers 
} from 'lucide-react';
import { getAuthHeaders } from '../../lib/api';

interface DatabaseControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

interface ConfirmDialogState {
  direction: 'cloud_to_local' | 'local_to_cloud' | 'bidirectional';
  title: string;
  subtitle: string;
  sourceLabel: string;
  targetLabel: string;
  details: string[];
  themeColor: 'purple' | 'emerald' | 'blue';
}

export default function DatabaseControlModal({ isOpen, onClose, settings, setSettings }: DatabaseControlModalProps) {
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [autoInitSchema, setAutoInitSchema] = useState(true);
  const [syncDetails, setSyncDetails] = useState<{ 
    totalRows: number; 
    tableStats: Record<string, number>; 
    errors: string[];
    direction?: string;
    directionBreakdown?: { cloudToLocal: number; localToCloud: number };
  } | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  if (!isOpen) return null;

  const dbConfig = settings['db_connection_config'] || {};
  const isLocalActive = !!dbConfig.connectionString || !!dbConfig.host;

  const getHeaders = async () => {
    return await getAuthHeaders({ 'Content-Type': 'application/json' });
  };

  const handleSaveDbConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/settings/db/switch', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(dbConfig)
      });
      if (res.ok) {
        setMessage({ text: 'Veritabanı bağlantısı başarıyla güncellendi.', type: 'success' });
      } else {
        setMessage({ text: 'Veritabanı bağlantısı güncellenemedi.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleInitDbSchema = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/settings/db/init', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(dbConfig)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Şema ve tüm tablolar başarıyla oluşturuldu/güncellendi!', type: 'success' });
      } else {
        setMessage({ text: `Hata: ${data.error || 'Şema oluşturulamadı.'}`, type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Open confirmation modal for requested sync action
  const requestSyncAction = (direction: 'cloud_to_local' | 'local_to_cloud' | 'bidirectional') => {
    if (!isLocalActive) {
      setMessage({ 
        text: 'Lütfen önce "Local (PostgreSQL)" seçeneğini belirleyip geçerli bir bağlantı adresi girerek "Bağlantıyı Uygula" butonuna basınız.', 
        type: 'error' 
      });
      return;
    }

    if (direction === 'cloud_to_local') {
      setConfirmDialog({
        direction: 'cloud_to_local',
        title: "Cloud'dan Local'e Kopyalama Onayı",
        subtitle: "Buluttaki (Neon) tüm tablolar ve veriler Yerel PostgreSQL sunucunuza aktarılacaktır.",
        sourceLabel: "Cloud (Neon PostgreSQL)",
        targetLabel: "Local (Yerel PostgreSQL)",
        themeColor: 'purple',
        details: [
          "Hedef yerel veritabanında tablolar henüz yoksa DDL şeması otomatik oluşturulacaktır.",
          "Mevcut veriler korunacak (ON CONFLICT DO NOTHING), çakışan satırlar ezilmeyecektir.",
          includeHistory 
            ? "Tarihsel fiyat barları (+10.000 satır / TEFAS & Kripto) aktarıma dahildir." 
            : "Hızlı aktarım: Yalnızca temel veriler ve güncel kayıtlar (~25K satır) aktarılacaktır."
        ]
      });
    } else if (direction === 'local_to_cloud') {
      setConfirmDialog({
        direction: 'local_to_cloud',
        title: "Local'den Cloud'a Kopyalama Onayı",
        subtitle: "Yerel veritabanınızdaki kayıtlar Bulut (Neon PostgreSQL) sunucusuna aktarılacaktır.",
        sourceLabel: "Local (Yerel PostgreSQL)",
        targetLabel: "Cloud (Neon PostgreSQL)",
        themeColor: 'emerald',
        details: [
          "Yerel sunucunuzda toplanan tüm şirket, borsa, fon ve piyasa verileri buluta aktarılır.",
          "Buluttaki mevcut kayıtlar korunacak (ON CONFLICT DO NOTHING), üzerine yazma yapılmayacaktır.",
          includeHistory 
            ? "Tarihsel fiyat ve bar verileri aktarıma dahildir." 
            : "Hızlı aktarım modu aktiftir."
        ]
      });
    } else {
      setConfirmDialog({
        direction: 'bidirectional',
        title: "Çift Yönlü Eşitleme (Two-Way Sync) Onayı",
        subtitle: "Cloud ve Local veritabanları karşılıklı taranarak her iki taraftaki eksikler eşitlenecektir.",
        sourceLabel: "Cloud 🔁 Local",
        targetLabel: "Her İki Veritabanı (Karşılıklı)",
        themeColor: 'blue',
        details: [
          "1. Adım: Cloud'da olup Local'de bulunmayan tüm veriler yerel veritabanına kopyalanır.",
          "2. Adım: Local'de olup Cloud'da bulunmayan tüm veriler bulut veritabanına kopyalanır.",
          "Hiçbir veri silinmez veya bozulmaz; her iki ortam da en güncel ortak duruma getirilir."
        ]
      });
    }
  };

  // Execute the confirmed sync action
  const executeConfirmedSync = async () => {
    if (!confirmDialog) return;
    const { direction } = confirmDialog;
    setConfirmDialog(null);

    try {
      setSyncing(true);
      setMessage(null);
      setSyncDetails(null);

      const res = await fetch('/api/settings/db/sync', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ 
          direction,
          includeLargeHistory: includeHistory,
          autoInitSchema
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        if (data.tableStats) {
          setSyncDetails({
            totalRows: data.totalRows || 0,
            tableStats: data.tableStats,
            errors: data.errors || [],
            direction: data.direction,
            directionBreakdown: data.directionBreakdown
          });
        }
      } else {
        setMessage({ text: `Hata: ${data.error || 'Senkronizasyon başarısız oldu.'}`, type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const setLocalConfig = (val: string) => {
    setSettings(prev => ({
      ...prev,
      db_connection_config: { ...prev.db_connection_config, connectionString: val }
    }));
  };

  const toggleTarget = (target: 'cloud' | 'local') => {
    if (target === 'cloud') {
      setSettings(prev => ({
        ...prev,
        db_connection_config: {}
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        db_connection_config: { 
          connectionString: prev.db_connection_config?.connectionString || 'postgresql://user:password@localhost:5432/dbname' 
        }
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Veritabanı & Senkronizasyon Kontrol Paneli
              </h2>
              <p className="text-xs text-neutral-500">
                Cloud (Neon) ve Yerel (Local) PostgreSQL arasında veri aktarımı ve şema yönetimi
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Notifications */}
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2.5 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" /> : <XCircle size={18} className="shrink-0 mt-0.5 text-red-600" />}
              <div className="leading-relaxed">{message.text}</div>
            </div>
          )}

          {/* Sync In Progress Banner */}
          {syncing && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
              <RefreshCw size={20} className="animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-blue-900 dark:text-blue-200">Veritabanı Senkronizasyonu Devam Ediyor...</div>
                <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  Tablolar kontrol ediliyor ve satırlar güvenle kopyalanıyor. Lütfen pencereyi kapatmayınız.
                </div>
              </div>
            </div>
          )}

          {/* DB Engine Target Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              1. Aktif Veritabanı Seçimi
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => toggleTarget('cloud')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                  !isLocalActive 
                    ? 'bg-blue-50/80 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 shadow-sm ring-2 ring-blue-500/20' 
                    : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 opacity-60 hover:opacity-100'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${!isLocalActive ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'}`}>
                  <Cloud size={20} />
                </div>
                <div>
                  <div className={`font-bold text-sm ${!isLocalActive ? 'text-blue-900 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300'}`}>Cloud (Neon SQL)</div>
                  <div className="text-xs text-neutral-500 mt-1">Varsayılan bulut ortamı. Canlı veriler otomatik buraya yazılır.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleTarget('local')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                  isLocalActive 
                    ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700 shadow-sm ring-2 ring-emerald-500/20' 
                    : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 opacity-60 hover:opacity-100'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isLocalActive ? 'bg-emerald-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'}`}>
                  <Server size={20} />
                </div>
                <div>
                  <div className={`font-bold text-sm ${isLocalActive ? 'text-emerald-900 dark:text-emerald-300' : 'text-neutral-700 dark:text-neutral-300'}`}>Local (PostgreSQL)</div>
                  <div className="text-xs text-neutral-500 mt-1">Kendi yerel PostgreSQL sunucunuzu bağlayın veya verileri buraya aktarın.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Local PostgreSQL Config Form */}
          {isLocalActive && (
            <div className="p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  Bulut Ortamı & Localhost Uyarısı
                </div>
                <p>
                  Uygulama bulut konteynerinde çalıştığı için <code>localhost:5432</code> adresi sizin bilgisayarınıza değil bulut sunucusuna bakar. Kendi yerel PostgreSQL sunucunuzu bağlamak için <code>ngrok tcp 5432</code> tünel adresini veya ücretsiz bir bulut veritabanını (Neon/Supabase) kullanınız.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                    PostgreSQL Connection String
                  </label>
                  <span className="text-[11px] text-neutral-400">Şablon Seç:</span>
                </div>
                <input 
                  type="password"
                  placeholder="postgresql://user:password@host:port/dbname?sslmode=require"
                  value={dbConfig.connectionString || ''}
                  onChange={(e) => setLocalConfig(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
                  <span className="text-neutral-500">Şablonlar:</span>
                  <button
                    type="button"
                    onClick={() => setLocalConfig('postgresql://postgres:password@localhost:5432/finance_db')}
                    className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-300 font-mono"
                  >
                    Local Şablon (5432)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalConfig('postgresql://postgres:password@0.tcp.ngrok.io:12345/finance_db')}
                    className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 font-mono"
                  >
                    Ngrok TCP Şablonu
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDbConfig}
                  disabled={saving || syncing}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Server size={16} />
                  {saving ? 'Bağlanıyor...' : 'Bağlantıyı Uygula & Aktifleştir'}
                </button>
                <button
                  type="button"
                  onClick={handleInitDbSchema}
                  disabled={saving || syncing}
                  className="py-2.5 px-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  title="Yerel veritabanında tüm tabloları sıfırdan oluşturur."
                >
                  <Layers size={16} />
                  Şema Oluştur (DDL)
                </button>
              </div>
            </div>
          )}

          {/* Sync Operations Hub */}
          <div className="p-5 bg-neutral-50/80 dark:bg-neutral-800/30 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <RefreshCw size={16} className="text-purple-600 dark:text-purple-400" />
                  2. Veri & Tablo Kopyalama İşlemleri
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Her butona tıklandığında sizden onay istenir. Tablolar yoksa otomatik oluşturulur.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoInitSchema}
                    onChange={(e) => setAutoInitSchema(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  Tabloları Otomatik Oluştur
                </label>
              </div>
            </div>

            {/* Sync Options */}
            <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={(e) => setIncludeHistory(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                Tarihsel fiyat barlarını da aktar (+10.000 bar / TEFAS & Kripto)
              </label>
              <span className="text-[11px] font-mono text-neutral-400">
                {includeHistory ? 'Tam Geçmiş Modu' : 'Hızlı Aktarım (~25K Satır)'}
              </span>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1. Cloud to Local */}
              <button
                type="button"
                onClick={() => requestSyncAction('cloud_to_local')}
                disabled={saving || syncing || !isLocalActive}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  !isLocalActive 
                    ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700' 
                    : 'bg-purple-50/60 hover:bg-purple-100/70 border-purple-200 text-purple-900 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-purple-200/60 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    <ArrowDown size={16} />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                    Cloud ➔ Local
                  </span>
                </div>
                <div>
                  <div className="font-bold text-xs">Cloud'dan Local'e Kopyala</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Buluttaki tüm tabloları ve verileri yerel veritabanına aktarır.
                  </div>
                </div>
              </button>

              {/* 2. Local to Cloud */}
              <button
                type="button"
                onClick={() => requestSyncAction('local_to_cloud')}
                disabled={saving || syncing || !isLocalActive}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  !isLocalActive 
                    ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700' 
                    : 'bg-emerald-50/60 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-emerald-200/60 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <ArrowUp size={16} />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Local ➔ Cloud
                  </span>
                </div>
                <div>
                  <div className="font-bold text-xs">Local'den Cloud'a Kopyala</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Yereldeki kayıtları bulut Neon veritabanına aktarır.
                  </div>
                </div>
              </button>

              {/* 3. Bidirectional */}
              <button
                type="button"
                onClick={() => requestSyncAction('bidirectional')}
                disabled={saving || syncing || !isLocalActive}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  !isLocalActive 
                    ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700' 
                    : 'bg-blue-50/60 hover:bg-blue-100/70 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-1.5 rounded-lg bg-blue-200/60 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    <ArrowLeftRight size={16} />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                    İki Yönlü Eşitle
                  </span>
                </div>
                <div>
                  <div className="font-bold text-xs">Çift Yönlü Eşitle (Two-Way)</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Cloud ve Local veritabanlarını karşılıklı eşitler.
                  </div>
                </div>
              </button>
            </div>

            {!isLocalActive && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                <span>Kopyalama butonlarını kullanabilmek için yukarıdan <b>Local (PostgreSQL)</b> seçeneğini seçip bağlantınızı uygulayınız.</span>
              </div>
            )}
          </div>

          {/* Sync Results & Breakdown */}
          {syncDetails && (
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Son Aktarım Detayları:
                  </span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Toplam {Number(syncDetails.totalRows).toLocaleString('tr-TR')} satır aktarıldı
                </span>
              </div>

              {syncDetails.directionBreakdown && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 font-medium">
                    Cloud ➔ Local: {Number(syncDetails.directionBreakdown.cloudToLocal).toLocaleString('tr-TR')} satır
                  </div>
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-medium">
                    Local ➔ Cloud: {Number(syncDetails.directionBreakdown.localToCloud).toLocaleString('tr-TR')} satır
                  </div>
                </div>
              )}

              <div className="text-xs font-semibold text-neutral-500">Tablo Bazında Dağılım:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] max-h-48 overflow-y-auto pr-1">
                {Object.entries(syncDetails.tableStats).map(([table, count]) => (
                  <div key={table} className="flex justify-between py-1 px-2 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/50">
                    <span className="text-neutral-600 dark:text-neutral-400 font-mono truncate" title={table}>{table}</span>
                    <span className="font-bold text-neutral-900 dark:text-white ml-2">{Number(count).toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>

              {syncDetails.errors.length > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-2 border-t border-red-100 dark:border-red-900/30 pt-2">
                  <b>Karşılaşılan Notlar / Hatalar:</b> {syncDetails.errors.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-sm font-bold transition-colors"
          >
            Kapat
          </button>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE CONFIRMATION MODAL (EMİN MİSİNİZ DİYALOĞU)                     */}
        {/* ========================================================================= */}
        {confirmDialog && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl w-full max-w-md p-6 space-y-5">
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-xl shrink-0 ${
                  confirmDialog.themeColor === 'purple' 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : confirmDialog.themeColor === 'emerald'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {confirmDialog.subtitle}
                  </p>
                </div>
              </div>

              {/* Source -> Target Visual Badge */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Kaynak</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{confirmDialog.sourceLabel}</span>
                </div>
                <ArrowLeftRight size={16} className="text-neutral-400" />
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block uppercase font-bold">Hedef</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{confirmDialog.targetLabel}</span>
                </div>
              </div>

              {/* Detail bullet points */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">İşlem Güvenceleri & Kurallar:</div>
                <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 list-disc list-inside">
                  {confirmDialog.details.map((detail, idx) => (
                    <li key={idx} className="leading-relaxed">{detail}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 font-semibold text-center">
                Bu senkronizasyon işlemini başlatmak istediğinizden emin misiniz?
              </div>

              {/* Confirm Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Vazgeç / İptal
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedSync}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                    confirmDialog.themeColor === 'purple'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : confirmDialog.themeColor === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Evet, Kopyalamayı Başlat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
