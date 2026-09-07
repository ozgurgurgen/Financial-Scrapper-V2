import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, Key, Shield, Server, RefreshCw, CheckCircle2, XCircle, Activity, Sparkles, Cpu, Globe, Database, Network, Newspaper, Trash2, Sliders, Check, Radio, Bot, Send, Bell, Terminal, Zap, HardDrive } from 'lucide-react';
import { apiFetch, getAuthHeaders } from '../../lib/api';
import DatabaseControlModal from '../modals/DatabaseControlModal';
import DataSourceHealthSubApp from './DataSourceHealthSubApp';
import TelegramSettingsSection from './TelegramSettingsSection';

export interface NewsRetentionConfig {
  maxTotalNews: number;
  categories: {
    BIST: number;
    EKONOMI: number;
    GLOBAL: number;
    KRIPTO: number;
    HALKA_ARZ: number;
  };
}

export default function SettingsTab() {
  const [activeTab, setActiveTab] = useState<'news' | 'datasources' | 'telegram' | 'ai' | 'sync' | 'system'>('datasources');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [newsSettings, setNewsSettings] = useState<NewsRetentionConfig>({
    maxTotalNews: 50,
    categories: {
      BIST: 50,
      EKONOMI: 50,
      GLOBAL: 50,
      KRIPTO: 50,
      HALKA_ARZ: 50,
    },
  });
  const [pruningNews, setPruningNews] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success?: boolean; message?: string; output?: string } | null>(null);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchNewsSettings();
    fetchSyncLogs();
  }, []);

  const getHeaders = async () => {
    return await getAuthHeaders({ 'Content-Type': 'application/json' });
  };

  const fetchNewsSettings = async () => {
    try {
      const res = await apiFetch('/api/news/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setNewsSettings(data.settings);
        }
      }
    } catch (e) {
      console.error('Failed to load news settings:', e);
    }
  };

  const handleSaveNewsSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/news/settings', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(newsSettings),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Haber limitleri ve kategori ayarları başarıyla kaydedildi.', type: 'success' });
        if (data.settings) setNewsSettings(data.settings);
      } else {
        setMessage({ text: data.error || 'Haber ayarları kaydedilemedi.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handlePruneNewsNow = async () => {
    try {
      setPruningNews(true);
      setMessage(null);
      const res = await fetch('/api/news/prune', {
        method: 'POST',
        headers: await getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || 'Eski haberler temizlendi.', type: 'success' });
      } else {
        setMessage({ text: 'Temizleme sırasında hata oluştu.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setPruningNews(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const res = await apiFetch('/api/sync/logs');
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDbConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/settings/db/switch', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(settings['db_connection_config'] || {})
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
        body: JSON.stringify(settings['db_connection_config'] || {})
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Şema başarıyla oluşturuldu/güncellendi!', type: 'success' });
        console.log(data.output);
      } else {
        setMessage({ text: `Hata: ${data.error || 'Şema oluşturulamadı.'}`, type: 'error' });
        console.error(data.errorOutput);
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSaveSetting = async (key: string, value: any) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        setMessage({ text: 'Ayarlar başarıyla kaydedildi.', type: 'success' });
        setSettings(prev => ({ ...prev, [key]: value }));
      } else {
        setMessage({ text: 'Ayarlar kaydedilemedi.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const testAiConnection = async () => {
    try {
      setTestingAi(true);
      setAiTestResult(null);
      const aiConfig = settings['ai_settings'] || {
        enabled: true,
        summarizeLargeDocs: true,
        largeDocMinLength: 1000,
        provider: 'gemini',
        geminiModel: 'gemini-2.5-flash',
        localUrl: 'http://localhost:11434/api/generate',
        localModel: 'llama3',
        openrouterModel: 'meta-llama/llama-3.1-8b-instruct',
        ninerouterUrl: 'http://localhost:4000/v1/chat/completions',
        ninerouterModel: 'default'
      };

      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(aiConfig)
      });
      const data = await res.json();
      setAiTestResult(data);
    } catch (err: any) {
      setAiTestResult({ success: false, message: err.message });
    } finally {
      setTestingAi(false);
    }
  };

  const triggerSync = async (source: string) => {
    try {
      setTriggering(prev => ({ ...prev, [source]: true }));
      setMessage(null);
      const res = await fetch(`/api/sync/trigger/${source}`, {
        method: 'POST',
        headers: await getHeaders()
      });
      const data = await res.json();
      if (res.ok && data.status === 'SUCCESS') {
        setMessage({ text: `${source} senkronizasyonu başarılı. (${data.recordsProcessed || 0} kayıt işlendi)`, type: 'success' });
        fetchSyncLogs(); // refresh logs
      } else {
        setMessage({ text: `${source} senkronizasyon hatası: ${data.error || data.message || 'Bilinmeyen hata'}`, type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message, type: 'error' });
    } finally {
      setTriggering(prev => ({ ...prev, [source]: false }));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Yükleniyor...</div>;
  }

  const renderSyncConfig = (source: string, title: string) => {
    const settingKey = `sync_settings_${source}`;
    const config = settings[settingKey] || { enabled: true, cron: '0 * * * *' };

    return (
      <div className="p-5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-neutral-900 dark:text-white">{title} Servisi</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.enabled}
              onChange={(e) => handleSaveSetting(settingKey, { ...config, enabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-neutral-500 mb-1">Cron İfadesi (Çalışma Sıklığı)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={config.cron}
              onChange={(e) => setSettings(prev => ({ ...prev, [settingKey]: { ...config, cron: e.target.value } }))}
              className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0 * * * *"
            />
            <button 
              onClick={() => handleSaveSetting(settingKey, config)}
              className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Kaydet
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Örn: "0 * * * *" her saat başı, "*/15 * * * *" her 15 dakikada bir</p>
        </div>

        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
           <button
             onClick={() => triggerSync(source)}
             disabled={triggering[source]}
             className="flex items-center gap-2 px-4 py-2 w-full justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
           >
             <RefreshCw size={16} className={triggering[source] ? 'animate-spin' : ''} />
             {triggering[source] ? 'Senkronize Ediliyor...' : 'Şimdi Senkronize Et'}
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Settings className="text-blue-500" />
          Sistem & Servis Ayarları
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Senkronizasyon aralıkları, API anahtarları ve servis durumu yapılandırması.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex space-x-1 flex-wrap sm:flex-nowrap bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('datasources')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'datasources' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/50 dark:border-neutral-600/50' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Radio size={16} className="text-emerald-500" />
          Veri Sağlığı & Kurtarma
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'telegram' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/50 dark:border-neutral-600/50' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Send size={16} className="text-sky-500" />
          Telegram Alarmları
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'news' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/50 dark:border-neutral-600/50' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Newspaper size={16} />
          Haber Ayarları & Limitler
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'ai' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/50 dark:border-neutral-600/50' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Sparkles size={16} />
          Yapay Zeka & Model
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'sync' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/50 dark:border-neutral-600/50' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <RefreshCw size={16} />
          Senkronizasyon
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'system' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm border border-neutral-200/50 dark:border-neutral-600/50' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Server size={16} />
          Sistem & API
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'datasources' && (
          <DataSourceHealthSubApp />
        )}

        {activeTab === 'telegram' && (
          <TelegramSettingsSection />
        )}

        {activeTab === 'news' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Global News Limits */}
            <div className="lg:col-span-1 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Sliders size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Genel Haber Limiti</h3>
                    <p className="text-xs text-neutral-500">Maksimum saklanacak ve gösterilecek haber sayısı</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Tek Seferde Gösterim Limiti</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{newsSettings.maxTotalNews} Haber</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={newsSettings.maxTotalNews}
                    onChange={(e) => setNewsSettings(prev => ({ ...prev, maxTotalNews: parseInt(e.target.value, 10) || 50 }))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                    <span>10 Min</span>
                    <span>50 (Varsayılan)</span>
                    <span>200 Maks</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                      <Clock size={16} className="text-amber-500" />
                      Otomatik FIFO Temizleme Kuralı
                    </div>
                    <p className="leading-relaxed text-[12px] text-neutral-500 dark:text-neutral-400">
                      Yeni haberler çekildikçe ve sınır ({newsSettings.maxTotalNews}) aşıldığında, <strong>51. ve daha eski olan tüm haberler sistemden otomatik silinir</strong>. Veritabanınız her zaman taze ve optimize kalır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={handleSaveNewsSettings}
                  disabled={saving}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Kaydediliyor...' : 'Haber Ayarlarını Kaydet'}
                </button>
                <button
                  onClick={handlePruneNewsNow}
                  disabled={pruningNews}
                  className="w-full py-2.5 bg-neutral-100 hover:bg-red-50 dark:bg-neutral-800 dark:hover:bg-red-950/40 text-neutral-700 hover:text-red-600 dark:text-neutral-300 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={16} className={pruningNews ? 'animate-spin' : ''} />
                  {pruningNews ? 'Eski Haberler Temizleniyor...' : 'Eski / Fazla Haberleri Şimdi Temizle'}
                </button>
              </div>
            </div>

            {/* Category-Specific Limits */}
            <div className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Newspaper size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Kategoriye Göre Limitler</h3>
                    <p className="text-xs text-neutral-500">Her finans ve piyasa kategorisi için saklanacak maksimum haber adedi</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNewsSettings({
                      maxTotalNews: 50,
                      categories: { BIST: 50, EKONOMI: 50, GLOBAL: 50, KRIPTO: 50, HALKA_ARZ: 50 }
                    });
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Varsayılana Sıfırla (50)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BIST */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      Borsa İstanbul (BIST)
                    </span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{newsSettings.categories?.BIST || 50} adet</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={newsSettings.categories?.BIST || 50}
                    onChange={(e) => setNewsSettings(prev => ({
                      ...prev,
                      categories: { ...prev.categories, BIST: parseInt(e.target.value, 10) || 50 }
                    }))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  />
                  <p className="text-[11px] text-neutral-500">KAP bildirimleri, şirket özel durumları ve BIST bültenleri</p>
                </div>

                {/* EKONOMI */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      Makroekonomi & TCMB
                    </span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{newsSettings.categories?.EKONOMI || 50} adet</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={newsSettings.categories?.EKONOMI || 50}
                    onChange={(e) => setNewsSettings(prev => ({
                      ...prev,
                      categories: { ...prev.categories, EKONOMI: parseInt(e.target.value, 10) || 50 }
                    }))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  />
                  <p className="text-[11px] text-neutral-500">TCMB faiz kararları, TÜİK enflasyon ve büyüme göstergeleri</p>
                </div>

                {/* GLOBAL */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                      Küresel Piyasalar (Global)
                    </span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{newsSettings.categories?.GLOBAL || 50} adet</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={newsSettings.categories?.GLOBAL || 50}
                    onChange={(e) => setNewsSettings(prev => ({
                      ...prev,
                      categories: { ...prev.categories, GLOBAL: parseInt(e.target.value, 10) || 50 }
                    }))}
                    className="w-full accent-sky-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  />
                  <p className="text-[11px] text-neutral-500">FED, ECB kararları, Wall Street, S&P 500 ve emtia haberleri</p>
                </div>

                {/* KRIPTO */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      Kripto Paralar
                    </span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{newsSettings.categories?.KRIPTO || 50} adet</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={newsSettings.categories?.KRIPTO || 50}
                    onChange={(e) => setNewsSettings(prev => ({
                      ...prev,
                      categories: { ...prev.categories, KRIPTO: parseInt(e.target.value, 10) || 50 }
                    }))}
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  />
                  <p className="text-[11px] text-neutral-500">Bitcoin, Ethereum, DeFi, zincir üstü (on-chain) ve borsa haberleri</p>
                </div>

                {/* HALKA_ARZ */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-3 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      SPK Halka Arzlar
                    </span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{newsSettings.categories?.HALKA_ARZ || 50} adet</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={newsSettings.categories?.HALKA_ARZ || 50}
                    onChange={(e) => setNewsSettings(prev => ({
                      ...prev,
                      categories: { ...prev.categories, HALKA_ARZ: parseInt(e.target.value, 10) || 50 }
                    }))}
                    className="w-full accent-purple-600 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                  />
                  <p className="text-[11px] text-neutral-500">SPK onayları, taslak izahnameler, talep toplama tarihleri ve tavan serisi bildirimleri</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-6">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
                  <Settings className="text-blue-500" size={20} />
                  Genel Ayarlar
                </h3>
                <p className="text-sm text-neutral-500 mt-1">Uygulama adı, logo ve temel yapılandırmalar.</p>
              </div>
              
              <div className="space-y-5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Uygulama Adı</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Financial Scraper"
                      value={settings['app_name']?.value || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, app_name: { value: e.target.value } }))}
                      className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={() => handleSaveSetting('app_name', settings['app_name'])} className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold hover:opacity-90">Kaydet</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Logo URL / Base64</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text"
                      placeholder="https://... veya data:image/png;base64,..."
                      value={settings['app_logo']?.value || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, app_logo: { value: e.target.value } }))}
                      className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={() => handleSaveSetting('app_logo', settings['app_logo'])} className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold hover:opacity-90">Kaydet</button>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 flex items-center justify-center">
                      {settings['app_logo']?.value ? (
                        <img src={settings['app_logo'].value} alt="Önizleme" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-neutral-400">Önizleme</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-neutral-500 mb-2">Alternatif olarak bilgisayarınızdan bir görsel seçebilirsiniz. Seçilen görsel Base64 formatına çevrilerek kaydedilir.</p>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              setSettings(prev => ({ ...prev, app_logo: { value: base64String } }));
                              handleSaveSetting('app_logo', { value: base64String });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ai' && (
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-6">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
                <Sparkles className="text-amber-500" size={20} /> 
                Yapay Zeka (AI) & Belge Özetleme
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                KAP'tan gelen finansal raporları ve uzun bildirimleri özetlemek için yapay zeka ayarları.
              </p>
            </div>
            
            <div className="space-y-5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              {/* Main AI Toggle */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                <div>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">AI Özetleme Motoru</div>
                  <div className="text-xs text-neutral-500 mt-0.5">Bildirim ve raporları yapay zeka ile analiz et</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings['ai_settings']?.enabled ?? true}
                    onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), enabled: e.target.checked } }))}
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Large Doc Option */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">Büyük Belgeleri Otomatik Özetle</div>
                    <div className="text-xs text-neutral-500 mt-0.5">Belge boyutu eşiği aştığında otomatik AI özeti oluştur</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings['ai_settings']?.summarizeLargeDocs ?? true}
                      onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), summarizeLargeDocs: e.target.checked } }))}
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
                    Büyük Belge Karakter Eşiği
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="200"
                      max="50000"
                      step="100"
                      value={settings['ai_settings']?.largeDocMinLength ?? 1000}
                      onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), largeDocMinLength: Number(e.target.value) } }))}
                      className="w-32 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-xs text-neutral-400">karakter (Örn: 1000 karakter üstü)</span>
                  </div>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Yapay Zeka Sağlayıcısı (Provider) Seçimi
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Aktif: {(settings['ai_settings']?.provider || 'gemini').toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
                  {[
                    { id: 'gemini', label: 'Gemini', icon: Sparkles, color: 'blue' },
                    { id: 'openai', label: 'OpenAI', icon: Bot, color: 'emerald' },
                    { id: 'anthropic', label: 'Claude', icon: Cpu, color: 'amber' },
                    { id: 'deepseek', label: 'DeepSeek', icon: Terminal, color: 'sky' },
                    { id: 'groq', label: 'Groq', icon: Zap, color: 'orange' },
                    { id: 'openrouter', label: 'OpenRouter', icon: Sparkles, color: 'purple' },
                    { id: 'local', label: 'Yerel (Ollama)', icon: HardDrive, color: 'teal' },
                    { id: '9router', label: '9router Proxy', icon: Network, color: 'rose' },
                  ].map((p) => {
                    const isSelected = (settings['ai_settings']?.provider || 'gemini') === p.id;
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), provider: p.id as any } }))}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-500 font-bold shadow-sm ring-2 ring-blue-500/20'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <IconComp size={18} />
                        <span className="truncate w-full text-center">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Specific Provider Configs */}
                {(settings['ai_settings']?.provider || 'gemini') === 'gemini' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">API Anahtarı (API Key)</label>
                      <input 
                        type="password"
                        placeholder="Varsayılan sunucu ortam anahtarı kullanılır veya buraya özel anahtar girin"
                        value={settings['ai_settings']?.key || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), key: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Model Seçimi</label>
                      <select
                        value={settings['ai_settings']?.geminiModel || 'gemini-2.5-flash'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), geminiModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Önerilen, Hızlı & Kararlı)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (Kapsamlı Mantık ve Finansal Analiz)</option>
                        <option value="gemini-3.8-flash">gemini-3.8-flash (Deneysel)</option>
                        <option value="gemini-flash-latest">gemini-flash-latest</option>
                      </select>
                    </div>
                  </div>
                )}

                {settings['ai_settings']?.provider === 'openai' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">OpenAI API Key</label>
                      <input 
                        type="password"
                        placeholder="sk-proj-..."
                        value={settings['ai_settings']?.key || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), key: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">OpenAI Model Adı</label>
                      <input 
                        type="text"
                        placeholder="gpt-4o-mini, gpt-4o, o3-mini..."
                        value={settings['ai_settings']?.openaiModel || 'gpt-4o-mini'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), openaiModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {settings['ai_settings']?.provider === 'anthropic' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Anthropic Claude API Key</label>
                      <input 
                        type="password"
                        placeholder="sk-ant-..."
                        value={settings['ai_settings']?.key || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), key: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Claude Model Adı</label>
                      <input 
                        type="text"
                        placeholder="claude-3-5-haiku-20241022, claude-3-7-sonnet-20250219..."
                        value={settings['ai_settings']?.anthropicModel || 'claude-3-5-haiku-20241022'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), anthropicModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {settings['ai_settings']?.provider === 'deepseek' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">DeepSeek API Key</label>
                      <input 
                        type="password"
                        placeholder="sk-..."
                        value={settings['ai_settings']?.key || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), key: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">DeepSeek Model Seçimi</label>
                      <select
                        value={settings['ai_settings']?.deepseekModel || 'deepseek-chat'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), deepseekModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                      >
                        <option value="deepseek-chat">deepseek-chat (V3 - Genel Finans & Hızlı)</option>
                        <option value="deepseek-reasoner">deepseek-reasoner (R1 - Derin Akıl Yürütme)</option>
                      </select>
                    </div>
                  </div>
                )}

                {settings['ai_settings']?.provider === 'groq' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Groq Cloud API Key</label>
                      <input 
                        type="password"
                        placeholder="gsk_..."
                        value={settings['ai_settings']?.key || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), key: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Groq Ultra-Hızlı Model</label>
                      <select
                        value={settings['ai_settings']?.groqModel || 'llama-3.3-70b-versatile'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), groqModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      >
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (En Yüksek İsabet)</option>
                        <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Işık Hızında)</option>
                        <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                      </select>
                    </div>
                  </div>
                )}

                {settings['ai_settings']?.provider === 'openrouter' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">OpenRouter API Key</label>
                      <input 
                        type="password"
                        placeholder="sk-or-..."
                        value={settings['ai_settings']?.key || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), key: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">OpenRouter Model Adı</label>
                      <input 
                        type="text"
                        placeholder="meta-llama/llama-3.1-8b-instruct"
                        value={settings['ai_settings']?.openrouterModel || 'meta-llama/llama-3.1-8b-instruct'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), openrouterModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {settings['ai_settings']?.provider === '9router' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-semibold">💡 Bulut Ortamı Notu:</p>
                      <p>
                        Uygulama bulut sunucusunda çalıştığında <code>localhost</code> adresi bulut konteynerini hedefler. Kendi bilgisayarınızdaki 9router proxy'sine bağlanmak için Ngrok, Cloudflare Tunnel URL'si veya harici IP adresinizi kullanınız. Proxy ulaşılamadığında sistem kesintisiz olarak Google Gemini yedek motoruna otomatik geçer.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">9router Endpoint URL</label>
                      <input 
                        type="text"
                        placeholder="http://localhost:4000/v1/chat/completions"
                        value={settings['ai_settings']?.ninerouterUrl || 'http://localhost:4000/v1/chat/completions'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), ninerouterUrl: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">9router API Key (Opsiyonel)</label>
                      <input 
                        type="password"
                        placeholder="Eğer proxy'niz şifreliyse"
                        value={settings['ai_settings']?.ninerouterKey || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), ninerouterKey: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">9router Model Adı</label>
                      <input 
                        type="text"
                        placeholder="default"
                        value={settings['ai_settings']?.ninerouterModel || 'default'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), ninerouterModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), provider: 'gemini', geminiModel: 'gemini-2.5-flash' } }))}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      ← Google Gemini (Dahili Sunucu Motoru)'na Geç
                    </button>
                  </div>
                )}

                {settings['ai_settings']?.provider === 'local' && (
                  <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-semibold">💡 Bulut Ortamı Notu:</p>
                      <p>
                        Kendi bilgisayarınızdaki Ollama'ya buluttan erişmek için Ngrok veya genel IP adresi kullanabilirsiniz. Bağlantı sağlanamazsa sistem otomatik Gemini yedek motoruna geçer.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Yerel Sunucu Endpoint (Ollama / Local API)</label>
                      <input 
                        type="text"
                        placeholder="http://localhost:11434/api/generate"
                        value={settings['ai_settings']?.localUrl || 'http://localhost:11434/api/generate'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), localUrl: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      <p className="text-xs text-neutral-500 mt-1.5">Örn: Ollama için 'http://localhost:11434/api/generate'</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">Yerel Model Adı</label>
                      <input 
                        type="text"
                        placeholder="llama3, mistral, qwen2.5, phi3..."
                        value={settings['ai_settings']?.localModel || 'llama3'}
                        onChange={(e) => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), localModel: e.target.value } }))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, ai_settings: { ...(prev.ai_settings || {}), provider: 'gemini', geminiModel: 'gemini-2.5-flash' } }))}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      ← Google Gemini (Dahili Sunucu Motoru)'na Geç
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons for AI */}
              <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={testAiConnection}
                  disabled={testingAi}
                  className="flex-1 py-2.5 px-4 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2 text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={18} className={testingAi ? 'animate-spin' : ''} />
                  {testingAi ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveSetting('ai_settings', settings['ai_settings'] || { enabled: true, summarizeLargeDocs: true })}
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
              </div>

              {/* AI Test Result Banner */}
              {aiTestResult && (
                <div className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
                  aiTestResult.success 
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {aiTestResult.success ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600 mt-0.5" /> : <XCircle size={20} className="shrink-0 text-red-600 mt-0.5" />}
                  <div className="space-y-2 w-full">
                    <div className="font-bold">{aiTestResult.message}</div>
                    {aiTestResult.output && (
                      <div className="font-mono text-xs opacity-90 bg-white/60 dark:bg-black/40 p-3 rounded-lg border border-white/20 dark:border-white/10">
                        {aiTestResult.output}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Sync Configuration */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 h-fit">
              <h3 className="font-bold text-lg mb-5 flex items-center gap-2 text-neutral-900 dark:text-white">
                <Clock className="text-blue-500" size={20} /> 
                Otomatik Senkronizasyon
              </h3>
              <div className="space-y-4">
                {renderSyncConfig('KAP', 'KAP Bildirimleri')}
                {renderSyncConfig('TEFAS', 'TEFAS Fon Verileri')}
                {renderSyncConfig('YAHOO', 'Yahoo Finance (BIST/Global)')}
                {renderSyncConfig('TCMB', 'TCMB EVDS (Makro/Kur)')}
                {renderSyncConfig('FRED', 'Federal Reserve (Makro)')}
              </div>
            </div>

            {/* Sync Logs */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[800px]">
              <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <h3 className="font-bold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
                  <Activity className="text-emerald-500" size={20} /> 
                  Senkronizasyon Geçmişi (Loglar)
                </h3>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/50 sticky top-0 border-b border-neutral-200 dark:border-neutral-800">
                    <tr>
                      <th className="px-4 py-3 text-neutral-500 font-semibold">Servis</th>
                      <th className="px-4 py-3 text-neutral-500 font-semibold">Durum</th>
                      <th className="px-4 py-3 text-neutral-500 font-semibold">Kayıt</th>
                      <th className="px-4 py-3 text-neutral-500 font-semibold text-right">Zaman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {syncLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-neutral-500">Henüz senkronizasyon kaydı bulunmuyor.</td>
                      </tr>
                    ) : (
                      syncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{log.source}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                              log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-neutral-500">{log.recordsProcessed}</td>
                          <td className="px-4 py-3 font-mono text-neutral-500 text-right text-xs">
                            {new Date(log.startedAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-6">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
                  <Key className="text-purple-500" size={20} />
                  API Anahtarları
                </h3>
                <p className="text-sm text-neutral-500 mt-1">Harici veri servislerine erişim için gerekli anahtarlar.</p>
              </div>

              <div className="space-y-5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">TCMB EVDS API Key</label>
                  <div className="flex gap-2">
                    <input 
                      type="password"
                      placeholder="****************"
                      value={settings['tcmb_evds_key']?.key || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, tcmb_evds_key: { key: e.target.value } }))}
                      className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={() => handleSaveSetting('tcmb_evds_key', settings['tcmb_evds_key'])} className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold hover:opacity-90">Kaydet</button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">FRED API Key</label>
                  <div className="flex gap-2">
                    <input 
                      type="password"
                      placeholder="****************"
                      value={settings['fred_api_key']?.key || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, fred_api_key: { key: e.target.value } }))}
                      className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={() => handleSaveSetting('fred_api_key', settings['fred_api_key'])} className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold hover:opacity-90">Kaydet</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-6 h-fit">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
                  <Database className="text-emerald-500" size={20} />
                  Veritabanı Yönetimi
                </h3>
                <p className="text-sm text-neutral-500 mt-1">Sistemin bağlı olduğu veritabanını (PostgreSQL/Neon) yapılandırın.</p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setDbModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-sm font-bold transition-colors"
                >
                  <Server size={18} />
                  Veritabanı Kontrol Panelini Aç
                </button>
                <p className="text-xs text-neutral-500 text-center mt-3">
                  Bu bölümden Cloud SQL (Neon) veya Local DB arasında geçiş yapabilir, tabloları oluşturabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <DatabaseControlModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
}
