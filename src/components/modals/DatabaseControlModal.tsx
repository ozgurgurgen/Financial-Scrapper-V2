import React, { useState } from 'react';
import { Database, X, Cloud, Server, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { getAuthHeaders } from '../../lib/api';

interface DatabaseControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export default function DatabaseControlModal({ isOpen, onClose, settings, setSettings }: DatabaseControlModalProps) {
  const [saving, setSaving] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [syncDetails, setSyncDetails] = useState<{ totalRows: number; tableStats: Record<string, number>; errors: string[] } | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

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
      setTimeout(() => setMessage(null), 3000);
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
        setMessage({ text: 'Şema başarıyla oluşturuldu/güncellendi!', type: 'success' });
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

  const handleSyncCloudToLocal = async () => {
    try {
      setSaving(true);
      setMessage(null);
      setSyncDetails(null);
      const res = await fetch('/api/settings/db/sync', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ includeLargeHistory: includeHistory })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        if (data.tableStats) {
          setSyncDetails({
            totalRows: data.totalRows || 0,
            tableStats: data.tableStats,
            errors: data.errors || []
          });
        }
      } else {
        setMessage({ text: `Hata: ${data.error || 'Senkronizasyon başlatılamadı.'}`, type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
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
        db_connection_config: { connectionString: 'postgresql://user:password@localhost:5432/dbname' }
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Database className="text-blue-500" />
            Veritabanı Kontrol Paneli (Database Control)
          </h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
              <div>{message.text}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => toggleTarget('cloud')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                !isLocalActive 
                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 shadow-sm ring-1 ring-blue-500' 
                  : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 opacity-60 hover:opacity-100'
              }`}
            >
              <Cloud size={24} className={!isLocalActive ? 'text-blue-500' : 'text-neutral-400'} />
              <div>
                <div className={`font-bold ${!isLocalActive ? 'text-blue-700 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300'}`}>Cloud (Neon SQL)</div>
                <div className="text-xs text-neutral-500 mt-1">Varsayılan bulut veritabanı. Ortam değişkenlerindeki bağlantıyı kullanır.</div>
              </div>
            </button>

            <button
              onClick={() => toggleTarget('local')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                isLocalActive 
                  ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-500' 
                  : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 opacity-60 hover:opacity-100'
              }`}
            >
              <Server size={24} className={isLocalActive ? 'text-emerald-500' : 'text-neutral-400'} />
              <div>
                <div className={`font-bold ${isLocalActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>Local (PostgreSQL)</div>
                <div className="text-xs text-neutral-500 mt-1">Kendi yerel PostgreSQL sunucunuzu bağlayın.</div>
              </div>
            </button>
          </div>

          {isLocalActive && (
            <div className="p-5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  PostgreSQL Connection String
                </label>
                <input 
                  type="password"
                  placeholder="postgresql://user:password@localhost:5432/dbname"
                  value={dbConfig.connectionString || ''}
                  onChange={(e) => setLocalConfig(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDbConfig}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Bağlantıyı Uygula
                </button>
                <button
                  type="button"
                  onClick={handleInitDbSchema}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Şema Oluştur (Generate Schema)
                </button>
              </div>

              {/* Cloud to Local Data Migration Section */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHistory}
                      onChange={(e) => setIncludeHistory(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    Tarihsel fiyat barlarını da aktar (+10.000 bar / TEFAS & Kripto)
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    {includeHistory ? 'Tam Veri Kopyalama' : 'Hızlı Mod (~25K Satır)'}
                  </span>
                </div>

                {syncDetails && (
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-2 max-h-48 overflow-y-auto">
                    <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex justify-between">
                      <span>Aktarılan Tablolar:</span>
                      <span className="text-purple-600 dark:text-purple-400">Toplam {Number(syncDetails.totalRows).toLocaleString('tr-TR')} satır</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {Object.entries(syncDetails.tableStats).map(([table, count]) => (
                        <div key={table} className="flex justify-between py-0.5 px-1.5 rounded bg-neutral-50 dark:bg-neutral-800/50">
                          <span className="text-neutral-600 dark:text-neutral-400 font-mono truncate">{table}</span>
                          <span className="font-semibold text-neutral-900 dark:text-white ml-2">{Number(count).toLocaleString('tr-TR')}</span>
                        </div>
                      ))}
                    </div>
                    {syncDetails.errors.length > 0 && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1 border-t border-red-100 dark:border-red-900/30 pt-1">
                        Hatalar: {syncDetails.errors.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLocalActive && (
            <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Şu an varsayılan <b>Cloud (Neon SQL)</b> veritabanını kullanıyorsunuz. Uygula (Apply) işlemi yapmanıza gerek yoktur.
              </p>
              <button
                type="button"
                onClick={handleSaveDbConfig}
                disabled={saving}
                className="mt-3 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                Cloud Veritabanına Geç
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-between items-center">
           <button
             type="button"
             onClick={handleSyncCloudToLocal}
             disabled={saving || !isLocalActive}
             className={`py-2 px-4 border rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
               !isLocalActive 
                 ? 'opacity-50 cursor-not-allowed border-neutral-300 text-neutral-500' 
                 : 'border-purple-300 hover:bg-purple-50 text-purple-700 dark:border-purple-700 dark:hover:bg-purple-900/30 dark:text-purple-400'
             }`}
             title="Önce Local DB'ye bağlanmalısınız."
           >
             <RefreshCw size={15} /> Cloud'dan Local'e Veri Aktar
           </button>

           <button
            onClick={onClose}
            className="py-2 px-5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-sm font-bold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
