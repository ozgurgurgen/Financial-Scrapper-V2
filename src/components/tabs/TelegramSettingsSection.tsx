import React, { useState, useEffect } from 'react';
import { 
  Send, Bot, Bell, Shield, Activity, CheckCircle2, XCircle, 
  RefreshCw, Clock, AlertTriangle, Key, MessageSquare, 
  Zap, Database, Eye, EyeOff, HelpCircle, ChevronRight, Check,
  Calendar, Sun, Moon, PlayCircle
} from 'lucide-react';
import { apiFetch, getAuthHeaders } from '../../lib/api';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  alertOnFailover: boolean;
  alertOnErrors: boolean;
  alertOnCircuitBreaker: boolean;
  alertOnSyncFailure: boolean;
  healthReportIntervalMinutes: number;
  healthReportStartHour?: string;
  healthReportEndHour?: string;
  healthReportWeekendEnabled?: boolean;
  lastHealthReportAt?: string;
  lastAlertAt?: string;
  silentMode?: boolean;
  nextScheduledReportAt?: string;
  currentIstanbulTime?: string;
}

export interface TelegramDeliveryLog {
  id: string;
  type: 'ALERT' | 'HEALTH_REPORT' | 'TEST';
  timestamp: string;
  status: 'SENT' | 'FAILED';
  summary: string;
  error?: string;
}

export default function TelegramSettingsSection() {
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: false,
    alertOnFailover: true,
    alertOnErrors: true,
    alertOnCircuitBreaker: true,
    alertOnSyncFailure: true,
    healthReportIntervalMinutes: 60,
    healthReportStartHour: '09:00',
    healthReportEndHour: '23:00',
    healthReportWeekendEnabled: true,
    silentMode: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [logs, setLogs] = useState<TelegramDeliveryLog[]>([]);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const getHeaders = async () => {
    return await getAuthHeaders({ 'Content-Type': 'application/json' });
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/telegram/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (e) {
      console.error('Failed to load telegram config:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/api/v1/telegram/logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (e) {
      console.error('Failed to load telegram logs:', e);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      const res = await fetch('/api/v1/telegram/config', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: 'Telegram alarm ve sağlık raporu ayarları başarıyla kaydedildi.', type: 'success' });
        if (data.config) setConfig(data.config);
      } else {
        setFeedback({ text: data.error || 'Ayarlar kaydedilemedi.', type: 'error' });
      }
    } catch (e: any) {
      setFeedback({ text: e.message || 'Hata oluştu.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleTestMessage = async () => {
    if (!config.botToken || !config.chatId) {
      setFeedback({ text: 'Lütfen önce Bot Token ve Chat ID bilgilerini doldurunuz.', type: 'error' });
      return;
    }

    try {
      setTesting(true);
      setFeedback(null);
      const res = await fetch('/api/v1/telegram/test', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ token: config.botToken, chatId: config.chatId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: data.message || 'Test mesajı Telegram hesabınıza başarıyla iletildi!', type: 'success' });
        fetchLogs();
      } else {
        setFeedback({ text: `Telegram Bağlantı Hatası: ${data.error || 'Mesaj gönderilemedi'}`, type: 'error' });
      }
    } catch (e: any) {
      setFeedback({ text: `Bağlantı Hatası: ${e.message}`, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSendHealthReportNow = async () => {
    try {
      setReporting(true);
      setFeedback(null);
      const res = await fetch('/api/v1/telegram/health-report', {
        method: 'POST',
        headers: await getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: 'Sistem Sağlık Raporu oluşturuldu ve Telegram kanalınıza iletildi!', type: 'success' });
        fetchLogs();
        fetchConfig();
      } else {
        setFeedback({ text: `Rapor Gönderim Hatası: ${data.error || 'Gönderilemedi'}`, type: 'error' });
      }
    } catch (e: any) {
      setFeedback({ text: `Hata: ${e.message}`, type: 'error' });
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-blue-500" />
        <span className="text-sm">Telegram Ayarları Yükleniyor...</span>
      </div>
    );
  }

  const isConfigured = Boolean(config.botToken && config.chatId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-200 dark:border-sky-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20 shrink-0">
            <Send size={28} className="translate-x-[-1px] translate-y-[1px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Telegram Alarm & Sistem Sağlığı Raporlayıcısı</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                config.enabled && isConfigured
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
              }`}>
                {config.enabled && isConfigured ? '🟢 Canlı & Aktif' : isConfigured ? '🟡 Devre Dışı' : '⚪ Yapılandırılmadı'}
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl">
              Sistemdeki tüm veri kesintilerini, failover geçişlerini ve devre kesici karantinalarını anlık olarak Telegram'dan bildirin. Ayrıca belirleyeceğiniz aralıklarla tam teşekküllü sistem sağlık raporu alın.
            </p>
          </div>
        </div>

        {/* Global Enable Toggle */}
        <div className="flex items-center gap-3 bg-white dark:bg-neutral-800/80 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 self-start md:self-auto shrink-0 shadow-xs">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Bildirimler:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={config.enabled}
              onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <div className="w-12 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-sky-500"></div>
          </label>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
            : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={20} className="shrink-0 text-emerald-600" /> : <XCircle size={20} className="shrink-0 text-red-600" />}
          <div className="font-semibold">{feedback.text}</div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Credentials & Health Schedule */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Telegram Bot Credentials */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                <Key size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Telegram Bağlantı Bilgileri</h3>
                <p className="text-xs text-neutral-500">BotFather'dan aldığınız token ve bildirim almak istediğiniz Chat ID</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Telegram Bot Token <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Örn: 7123456789:AAFlm3wX_abc123456789xyz..."
                    value={config.botToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">Telegram'da <code>@BotFather</code> ile oluşturduğunuz botun erişim anahtarı.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                  Telegram Chat ID / Channel ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Örn: 123456789 veya kanallar için -1001234567890"
                  value={config.chatId}
                  onChange={(e) => setConfig(prev => ({ ...prev, chatId: e.target.value }))}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <p className="text-[11px] text-neutral-400 mt-1">Kendi kullanıcı ID'niz (<code>@userinfobot</code>'tan alabilirsiniz) veya botun yönetici olduğu bir kanal/grup ID'si.</p>
              </div>
            </div>

            {/* Quick Action Buttons for credentials */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
              </button>

              <button
                type="button"
                onClick={handleTestMessage}
                disabled={testing || !config.botToken || !config.chatId}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                {testing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {testing ? 'Gönderiliyor...' : 'Test Bildirimi Gönder'}
              </button>
            </div>
          </div>

          {/* Card 2: Health Report Schedule */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">Periyodik Sistem Sağlığı Raporu</h3>
                  <p className="text-xs text-neutral-500">Zamanlama kurallarına göre durum özetini Telegram'a iletir</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1.5">
                <Clock size={12} className="text-sky-500" />
                TSİ (UTC+3)
              </span>
            </div>

            {/* Next Scheduled Report Info Banner */}
            <div className="p-3.5 bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/30 dark:to-emerald-950/30 rounded-xl border border-sky-200/70 dark:border-sky-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-sky-500 text-white rounded-lg shadow-xs">
                  <PlayCircle size={16} />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                    Bir Sonraki Planlanan Rapor
                  </div>
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {config.nextScheduledReportAt || (
                      config.healthReportIntervalMinutes > 0 
                        ? `Her gün saat ${config.healthReportStartHour || '09:00'}'dan itibaren (${config.healthReportIntervalMinutes} dk periyotla)` 
                        : 'Periyodik raporlama kapalı'
                    )}
                  </div>
                </div>
              </div>
              {config.currentIstanbulTime && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Şu Anki Sistem Saati</div>
                  <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">{config.currentIstanbulTime} (TSİ)</div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* START TIME & END TIME CONFIGURATION */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-700/60 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  <Clock size={15} className="text-sky-500" />
                  Raporlama Saat Aralığı (Hangi Saatten İtibaren?)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Hour */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Başlangıç Saati <span className="text-red-500">*</span>
                      <span className="ml-1 text-[11px] font-normal text-neutral-500">(İlk mesaj bu saatte atılır)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={config.healthReportStartHour || '09:00'}
                        onChange={(e) => setConfig(prev => ({ ...prev, healthReportStartHour: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                      />
                    </div>
                    {/* Quick Start Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: '08:00 (Piyasa Öncesi)', val: '08:00' },
                        { label: '09:00 (Önerilen)', val: '09:00' },
                        { label: '10:00 (Açılış)', val: '10:00' },
                        { label: '00:00 (Tüm Gün)', val: '00:00' },
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, healthReportStartHour: p.val }))}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                            config.healthReportStartHour === p.val
                              ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* End Hour */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Bitiş Saati (Opsiyonel)
                      <span className="ml-1 text-[11px] font-normal text-neutral-500">(Gece rahatsız etmesin)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={config.healthReportEndHour ?? '23:00'}
                        onChange={(e) => setConfig(prev => ({ ...prev, healthReportEndHour: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                      />
                    </div>
                    {/* Quick End Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: '18:00 (Kapanış)', val: '18:00' },
                        { label: '21:00 (Akşam)', val: '21:00' },
                        { label: '23:00 (Gece)', val: '23:00' },
                        { label: 'Sınırsız (23:59)', val: '23:59' },
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, healthReportEndHour: p.val }))}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                            config.healthReportEndHour === p.val
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-white/70 dark:bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-200/70 dark:border-neutral-700/60 flex items-start gap-2">
                  <span className="text-sky-500 font-bold">ℹ️</span>
                  <span>
                    Raporlama seçtiğiniz <strong>{config.healthReportStartHour || '09:00'}</strong> saatinde başlar ve 
                    {config.healthReportEndHour ? ` saat ${config.healthReportEndHour}'e kadar ` : ' gün boyu '}
                    belirlediğiniz aralıklarla devam eder. Bu saatler dışındaki zaman diliminde periyodik mesaj gönderilmez.
                  </span>
                </div>
              </div>

              {/* INTERVAL SELECTION */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2 uppercase tracking-wider">
                  Rapor Gönderim Sıklığı (Aralık)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Kapalı', value: 0 },
                    { label: '15 Dakika', value: 15 },
                    { label: '30 Dakika', value: 30 },
                    { label: '1 Saat (Önerilen)', value: 60 },
                    { label: '3 Saat', value: 180 },
                    { label: '6 Saat', value: 360 },
                    { label: '12 Saat', value: 720 },
                    { label: '24 Saat (Günlük)', value: 1440 },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, healthReportIntervalMinutes: item.value }))}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between ${
                        config.healthReportIntervalMinutes === item.value
                          ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                          : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                      }`}
                    >
                      <span>{item.label}</span>
                      {config.healthReportIntervalMinutes === item.value && (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1">✓ Seçili</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekend & Silent Mode Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Weekend filter toggle */}
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-500" />
                      Hafta Sonu Raporları
                    </div>
                    <div className="text-[11px] text-neutral-500">Cumartesi ve Pazar günleri de periyodik rapor gönder.</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={config.healthReportWeekendEnabled ?? true}
                      onChange={(e) => setConfig(prev => ({ ...prev, healthReportWeekendEnabled: e.target.checked }))}
                    />
                    <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* Silent Mode toggle */}
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <Moon size={13} className="text-amber-500" />
                      Sessiz Bildirim Modu
                    </div>
                    <div className="text-[11px] text-neutral-500">Mesajları Telegram'a sessiz bildirim olarak iletir.</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={config.silentMode}
                      onChange={(e) => setConfig(prev => ({ ...prev, silentMode: e.target.checked }))}
                    />
                    <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-sky-500"></div>
                  </label>
                </div>
              </div>

              {/* Save & Instant Health Report Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-xs text-neutral-500">
                  {config.lastHealthReportAt ? (
                    <span>Son Rapor: <strong>{new Date(config.lastHealthReportAt).toLocaleString('tr-TR')}</strong></span>
                  ) : (
                    <span>Henüz periyodik rapor gönderilmedi.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    {saving ? 'Kaydediliyor...' : 'Zamanlamayı Kaydet'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendHealthReportNow}
                    disabled={reporting || !config.botToken || !config.chatId}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {reporting ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                    {reporting ? 'Oluşturuluyor...' : 'Sağlık Raporunu Şimdi Gönder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Alert Triggers & BotFather Guide & Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Alert Trigger Types */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Alarm & Bildirim Tetikleyicileri</h3>
                <p className="text-xs text-neutral-500">Hangi olaylarda anlık Telegram mesajı gönderilsin?</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'alertOnErrors',
                  title: 'Kritik Sistem & Veri Çökme Hataları',
                  desc: 'Veri sağlayıcıların erişilemez olması, API 500 hataları ve veri tabanı kopmaları.',
                  icon: '🚨',
                },
                {
                  key: 'alertOnFailover',
                  title: 'Otomatik Failover & Yedek Kaynak Geçişi',
                  desc: 'Birincil veri kaynağı düştüğünde sistemin alternatif aynaya otomatik geçmesi.',
                  icon: '⚡',
                },
                {
                  key: 'alertOnCircuitBreaker',
                  title: 'Devre Kesici (Circuit Breaker) Karantinası',
                  desc: 'Hatalı bir uç noktanın sistem sağlığını korumak için karantinaya alınması.',
                  icon: '🛡️',
                },
                {
                  key: 'alertOnSyncFailure',
                  title: 'Senkronizasyon & Cron Görev Hataları',
                  desc: 'Zamanlanmış otomatik veri çekimlerinde yaşanan aksaklıklar.',
                  icon: '🔄',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/60"
                >
                  <div className="flex items-start gap-2.5 pr-2">
                    <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-white">{item.title}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={(config as any)[item.key] ?? true}
                      onChange={(e) => setConfig(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-sky-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Quick 3-Step Setup Guide */}
          <div className="bg-sky-50/70 dark:bg-sky-950/20 p-5 rounded-2xl border border-sky-100 dark:border-sky-900/40 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-sky-900 dark:text-sky-300">
              <HelpCircle size={16} className="text-sky-600 dark:text-sky-400" />
              30 Saniyede Telegram Bot Kurulumu
            </div>
            <ol className="text-[12px] text-neutral-600 dark:text-neutral-400 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Telegram'da <strong>@BotFather</strong> botunu açıp <code>/newbot</code> komutu ile yeni botunuzu oluşturun ve verilen <strong>HTTP API Token</strong>'ı kopyalayın.
              </li>
              <li>
                Botunuzu bir gruba veya kanala yönetici (Admin) olarak ekleyin ya da bireysel mesaj almak için botunuza <code>/start</code> yazın.
              </li>
              <li>
                Chat ID'nizi öğrenmek için Telegram'da <strong>@userinfobot</strong>'a mesaj atarak ID numaranızı alın ve yukarıdaki alana yapıştırın.
              </li>
            </ol>
          </div>

          {/* Card 5: Recent Telegram Dispatch Logs */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-sky-500" />
                <h4 className="font-bold text-xs text-neutral-900 dark:text-white">Son Gönderim Hareketleri</h4>
              </div>
              <button onClick={fetchLogs} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 text-xs">
                  Henüz iletilen bildirim kaydı bulunmuyor.
                </div>
              ) : (
                logs.slice(0, 8).map((log) => (
                  <div key={log.id} className="p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'SENT' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                        {log.summary}
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
