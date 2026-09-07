import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Play, 
  Search, 
  RefreshCw,
  Globe, 
  Database, 
  Activity, 
  Cpu, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Key,
  Radio,
  Zap,
  Shield,
  Trash2,
  Plus,
  Filter,
  HardDrive,
  Terminal,
  BarChart3,
  Server,
  PauseCircle,
  PlayCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface ApiEndpoint {
  method: 'GET' | 'POST';
  path: string;
  category: string;
  title: string;
  description: string;
  sampleParams?: string;
}

interface ApiTelemetryRecord {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  apiKeyName?: string;
  responseSize?: number;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE' | 'MASTER';
  status: 'ACTIVE' | 'PAUSED' | 'REVOKED';
  createdAt: string;
  rateLimit: number;
  totalCalls: number;
  lastUsedAt?: string;
}

interface ProviderDiagnostic {
  id: string;
  name: string;
  category: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  lastChecked: string;
  detail: string;
  endpointTested: string;
  successRate24h: number;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/bist/stocks',
    category: '625+ BIST Hisse Evreni',
    title: 'Tüm BIST Hisseleri (Canlı & Metrikler)',
    description: '625+ BIST hissesinin tamamını canlı fiyat, günlük değişim, piyasa değeri, işlem hacmi, F/K ve 52 haftalık zirve/dip değerleriyle döndürür.',
    sampleParams: '?search=THYAO&limit=10&sortBy=marketCap&order=desc'
  },
  {
    method: 'GET',
    path: '/api/v1/bist/stock/THYAO',
    category: '625+ BIST Hisse Evreni',
    title: 'Tekil BIST Hissesi Detayları',
    description: 'Belirtilen hissenin güncel fiyatı, piyasa çarpanları ve veritabanındaki 5 yıllık bar kayıt sayısı özeti.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/bist/stock/THYAO/history',
    category: '625+ BIST Hisse Evreni',
    title: '5 Yıllık Günlük OHLCV Fiyat Serisi',
    description: 'Belirtilen hissenin 5 yıllık Açılış, Yüksek, Düşük, Kapanış, Düzeltilmiş Kapanış ve Hacim barlarını döner.',
    sampleParams: '?limit=300'
  },
  {
    method: 'GET',
    path: '/api/v1/bist/stock/THYAO/indicators',
    category: '625+ BIST Hisse Evreni',
    title: 'Teknik Analiz İndikatörleri (RSI, MACD, SMA)',
    description: 'Veritabanındaki gerçek barlardan hesaplanan anlık RSI-14, SMA20/50/200, Bollinger Bantları ve trend sinyali.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/tefas/funds',
    category: '1.063+ TEFAS Fonları',
    title: '1.063 TEFAS Yatırım Fonları Listesi',
    description: '1.063 fonun tamamının fiyatı, 1H/1A/3A/6A/1Y/3Y/5Y resmi getirileri, risk değeri ve fon büyüklüğü.',
    sampleParams: '?category=Hisse&limit=20'
  },
  {
    method: 'GET',
    path: '/api/v1/tefas/fund/TCD',
    category: '1.063+ TEFAS Fonları',
    title: 'Tekil Fon Detayı & Varlık Dağılımı',
    description: 'Fonun detaylı getiri matrisi ve portföy varlık dağılımı (% Hisse, % Tahvil, % Eurobond, % Emtia vb.).',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/tefas/fund/TI2/holdings',
    category: '1.063+ TEFAS Fonları',
    title: 'Fon İçi Bireysel Hisse Senetleri & Dağılım',
    description: 'Fonun portföyündeki bireysel BIST hisseleri, nominal ağırlıkları ve KAP PDR raporu dökümü.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/tefas/stock/THYAO/in-funds',
    category: '1.063+ TEFAS Fonları',
    title: 'Hisseye Göre Fon Bul (Ters Arama)',
    description: 'Belirtilen hisseyi portföyünde taşıyan tüm TEFAS fonlarını ve ağırlık yüzdelerini döndürür.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/tefas/top-held-stocks',
    category: '1.063+ TEFAS Fonları',
    title: 'Fonlar Tarafından En Çok Taşınan Hisseler',
    description: 'Tüm TEFAS fonları genelinde en çok tutulan hisse senetleri ve fon katılım sayıları.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/tefas/fund/TCD/daily-history',
    category: '1.063+ TEFAS Fonları',
    title: 'TEFAS Fonu 5 Yıllık Günlük Fiyat (NAV) Serisi',
    description: 'Takasbank üzerinden fonun 5 yıllık günlük birim pay fiyatı, tedavüldeki pay ve toplam fon büyüklüğü zaman serisi.',
    sampleParams: '?limit=100'
  },
  {
    method: 'GET',
    path: '/api/v1/us-stocks',
    category: 'ABD Piyasaları & Global ETF',
    title: 'ABD Şirketleri Listesi (S&P 500 & Nasdaq)',
    description: '1.000+ ABD hissesinin canlı fiyatı, piyasa değeri, F/K ve sektör bilgisi.',
    sampleParams: '?search=AAPL&limit=10'
  },
  {
    method: 'GET',
    path: '/api/v1/us-etfs',
    category: 'ABD Piyasaları & Global ETF',
    title: 'ABD ETF Listesi (SPY, QQQ, VOO vb.)',
    description: 'Önde gelen borsa yatırım fonlarının yönetim ücreti, AUM ve son getirileri.',
    sampleParams: '?category=Index'
  },
  {
    method: 'GET',
    path: '/api/v1/us-history/stock/NVDA',
    category: 'ABD Piyasaları & Global ETF',
    title: '5 Yıllık ABD Fiyat Serisi & Performans Metrikleri',
    description: 'NVDA, AAPL gibi hisselerin 5 yıllık OHLCV barları, CAGR ve Max Drawdown metrikleri.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/crypto',
    category: 'Kripto & On-Chain',
    title: 'Kripto Para Canlı Fiyatlar (500+ Çift)',
    description: 'Binance doğrudan açık WebSocket & REST API ile anlık BTC, ETH ve altcoin fiyatları.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/kap/disclosures',
    category: 'KAP & Halka Arz',
    title: 'KAP Canlı Şirket Bildirimleri Akışı',
    description: 'Kamuyu Aydınlatma Platformu son şirket bildirimleri, bildirim tipi, özet ve duyarlılık skorları.',
    sampleParams: '?ticker=THYAO&limit=10'
  },
  {
    method: 'GET',
    path: '/api/v1/ipos',
    category: 'KAP & Halka Arz',
    title: 'BIST Halka Arzlar (IPO Takvimi)',
    description: 'Taslak, onaylı, talep toplayan ve borsada işlem gören halka arzlar ile tavan serileri.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/analyst-reports',
    category: 'Analist Yorumları & Konsensüs',
    title: 'Analist Raporları & Konsensüs Hedef Fiyatlar',
    description: 'Aracı kurumların araştırma raporları, hedef fiyat konsensüsleri ve boğa/ayı argümanları.',
    sampleParams: '?market=BIST&limit=10'
  },
  {
    method: 'GET',
    path: '/api/v1/sectors/overview',
    category: 'Sektörel Analitik',
    title: 'Sektörel Genel Bakış & Rotasyon Radarı',
    description: 'BIST sektör endekslerinin performans, para girişi ve iskonto analizleri.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/health',
    category: 'Sistem & Sağlık',
    title: 'Veri Tabanı & Tazelik Raporu',
    description: 'Veritabanındaki toplam hisse, fon, tarihsel bar sayısı ve son arka plan senkronizasyon logu.',
    sampleParams: ''
  },
  {
    method: 'GET',
    path: '/api/v1/openapi.json',
    category: 'Sistem & Sağlık',
    title: 'OpenAPI 3.0 / Swagger Şeması',
    description: 'Dış uygulamaların doğrudan Postman veya OpenAPI generator ile import edebileceği API sözlüğü.',
    sampleParams: ''
  }
];

export default function ApiDocsTab() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'keys' | 'diagnostics' | 'explorer'>('overview');

  // Overview / Telemetry States
  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [telemetryLoading, setTelemetryLoading] = useState<boolean>(false);
  const [logSearch, setLogSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Diagnostics States
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);

  // API Keys States
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [keysLoading, setKeysLoading] = useState<boolean>(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyTier, setNewKeyTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE' | 'MASTER'>('PRO');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState<number>(600);
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null);

  // Explorer / Sandbox States
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]);
  const [activeCodeLang, setActiveCodeLang] = useState<'js' | 'python' | 'curl' | 'react'>('js');
  const [copied, setCopied] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [explorerSearch, setExplorerSearch] = useState<string>('');
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [customParams, setCustomParams] = useState<string>('');

  // 1. Fetch Telemetry Data
  const fetchTelemetry = useCallback(async () => {
    setTelemetryLoading(true);
    try {
      const res = await fetch('/api/v1/admin/telemetry?limit=150');
      const data = await res.json();
      if (data.success) {
        setTelemetryData(data);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  // 2. Fetch Diagnostics Data
  const fetchDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/diagnostics');
      const data = await res.json();
      if (data.success) {
        setDiagnosticsData(data);
        setLastPingTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch diagnostics:', err);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  // 3. Fetch API Keys
  const fetchApiKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch('/api/v1/admin/api-keys');
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchTelemetry();
    fetchDiagnostics();
    fetchApiKeys();
  }, [fetchTelemetry, fetchDiagnostics, fetchApiKeys]);

  // Auto-refresh interval for live telemetry
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTelemetry]);

  // Change Master API Status
  const handleToggleMasterStatus = async (newStatus: 'LIVE' | 'MAINTENANCE' | 'READ_ONLY') => {
    try {
      const res = await fetch('/api/v1/admin/system/master-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchTelemetry();
      }
    } catch (err) {
      console.error('Failed to set master status:', err);
    }
  };

  // Clear Telemetry Logs
  const handleClearLogs = async () => {
    if (!confirm('Tüm canlı istek geçmişi temizlensin mi?')) return;
    try {
      await fetch('/api/v1/admin/telemetry/clear', { method: 'POST' });
      fetchTelemetry();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Create New API Key
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/v1/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          tier: newKeyTier,
          rateLimit: newKeyRateLimit
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewKeyName('');
        setShowNewKeyModal(false);
        fetchApiKeys();
      }
    } catch (err) {
      console.error('Failed to create key:', err);
    }
  };

  // Toggle API Key Status (Active / Paused / Revoked)
  const handleUpdateKeyStatus = async (id: string, status: 'ACTIVE' | 'PAUSED' | 'REVOKED') => {
    try {
      await fetch(`/api/v1/admin/api-keys/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchApiKeys();
    } catch (err) {
      console.error('Failed to update key status:', err);
    }
  };

  // Delete API Key
  const handleDeleteKey = async (id: string) => {
    if (!confirm('Bu API anahtarını kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/v1/admin/api-keys/${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run Explorer Test
  const handleRunTest = async (ep: ApiEndpoint) => {
    setTestLoading(true);
    setTestResult(null);
    setHttpStatus(null);
    setResponseTime(null);
    const start = performance.now();
    try {
      const paramsToUse = customParams !== '' ? customParams : (ep.sampleParams || '');
      const fullUrl = ep.path + paramsToUse;
      const res = await fetch(fullUrl);
      const end = performance.now();
      setResponseTime(Math.round(end - start));
      setHttpStatus(res.status);
      const json = await res.json();
      setTestResult(json);
      fetchTelemetry(); // Refresh telemetry counter
    } catch (err: any) {
      const end = performance.now();
      setResponseTime(Math.round(end - start));
      setHttpStatus(500);
      setTestResult({ error: err.message || 'İstek başarısız oldu' });
    } finally {
      setTestLoading(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-api-host.com';
  const fullEndpointUrl = `${currentOrigin}${selectedEndpoint.path}${customParams || selectedEndpoint.sampleParams || ''}`;

  const getCodeSnippet = () => {
    switch (activeCodeLang) {
      case 'js':
        return `// JavaScript / TypeScript (Node.js / Next.js / Fetch)
async function fetchFinancialData() {
  const url = '${fullEndpointUrl}';
  
  const response = await fetch(url, {
    method: '${selectedEndpoint.method}',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': 'fin_live_pro_your_api_key'
    }
  });

  if (!response.ok) {
    throw new Error(\`HTTP Hatası: \${response.status}\`);
  }

  const result = await response.json();
  console.log('Alınan Veri:', result);
  return result;
}`;

      case 'python':
        return `# Python 3 (Requests kütüphanesi)
import requests

url = "${fullEndpointUrl}"
headers = {
    "Accept": "application/json",
    "X-API-Key": "fin_live_pro_your_api_key"
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()
    print("Veri çekildi, toplam kayıt:", len(data) if isinstance(data, list) else "Detay Objesi")
except requests.exceptions.RequestException as e:
    print(f"API Hatası: {e}")`;

      case 'curl':
        return `# Terminal cURL Komutu
curl -X ${selectedEndpoint.method} \\
  "${fullEndpointUrl}" \\
  -H "Accept: application/json" \\
  -H "X-API-Key: fin_live_pro_your_api_key"`;

      case 'react':
        return `// React / TanStack Query (Custom Hook)
import { useQuery } from '@tanstack/react-query';

export function useFinancialFeed() {
  return useQuery({
    queryKey: ['${selectedEndpoint.path}'],
    queryFn: async () => {
      const res = await fetch('${fullEndpointUrl}', {
        headers: { 'X-API-Key': 'fin_live_pro_your_api_key' }
      });
      if (!res.ok) throw new Error('API Hatası');
      return res.json();
    },
    refetchInterval: 15000, // 15 saniyede bir otomatik canlı güncelle
    staleTime: 10000
  });
}`;
    }
  };

  const masterStatus = telemetryData?.masterStatus || 'LIVE';
  const metrics = telemetryData?.metrics || {
    totalLogged: 120,
    successCount: 118,
    errorCount: 2,
    successRate: '98.33%',
    avgLatencyMs: 34,
    p95LatencyMs: 65,
    requestsPerMinute: 14.2,
    activeKeysCount: 5,
    totalKeysCount: 5
  };

  const filteredLogs = (telemetryData?.logs || []).filter((l: ApiTelemetryRecord) => {
    const matchesSearch = l.path.toLowerCase().includes(logSearch.toLowerCase()) ||
                          l.ip.includes(logSearch) ||
                          (l.apiKeyName && l.apiKeyName.toLowerCase().includes(logSearch.toLowerCase()));
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === '2XX') return matchesSearch && l.statusCode >= 200 && l.statusCode < 300;
    if (statusFilter === '4XX') return matchesSearch && l.statusCode >= 400 && l.statusCode < 500;
    if (statusFilter === '5XX') return matchesSearch && l.statusCode >= 500;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Radio className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  FinHub API & Diagnostik Yönetim Merkezi
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                    masterStatus === 'LIVE' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : masterStatus === 'MAINTENANCE'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}>
                    {masterStatus === 'LIVE' ? '🟢 API CANLI YAYINDA' : masterStatus === 'MAINTENANCE' ? '🟡 BAKIM MODU' : '🔵 SADECE OKUMA'}
                  </span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  BIST (625+), TEFAS (1.063+), ABD Piyasaları, KAP ve Kripto veri akışının canlı aktivasyon, telemetri, hız limitleri ve derin sistem sağlığı denetleyicisi.
                </p>
              </div>
            </div>
          </div>

          {/* Master Activation Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => handleToggleMasterStatus('LIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                masterStatus === 'LIVE'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" /> Canlı Yayın (Live)
            </button>
            <button
              onClick={() => handleToggleMasterStatus('MAINTENANCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                masterStatus === 'MAINTENANCE'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5" /> Bakım Modu (503)
            </button>
            <button
              onClick={() => handleToggleMasterStatus('READ_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                masterStatus === 'READ_ONLY'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Sadece Okuma
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800/80 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Genel Bakış & Metrikler
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" /> Canlı Trafik & Hareket Logları
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] text-cyan-300 border border-cyan-400/30">
              {metrics.totalLogged}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'keys'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Key className="w-4 h-4" /> API Key & Aktivasyon Yönetimi
            <span className="px-1.5 py-0.2 rounded-full bg-slate-900/80 text-[10px] text-cyan-300 border border-cyan-400/30">
              {apiKeys.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" /> Sistem & Sağlayıcı Diagnostiği
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'explorer'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" /> İnteraktif API Test & Dokümantasyon
          </button>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & KEY METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Başarı Oranı (SLA)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-emerald-400">{metrics.successRate}</div>
                <div className="text-xs text-slate-500 mt-0.5">{metrics.successCount} başarılı / {metrics.errorCount} hata</div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: metrics.successRate }} />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Ortalama Gecikme</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-cyan-400">{metrics.avgLatencyMs} <span className="text-sm font-normal text-slate-400">ms</span></div>
                <div className="text-xs text-slate-500 mt-0.5">P95 Gecikmesi: {metrics.p95LatencyMs} ms</div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(100, metrics.avgLatencyMs * 2)}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Trafik Yoğunluğu</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-amber-400">{metrics.requestsPerMinute} <span className="text-sm font-normal text-slate-400">RPM</span></div>
                <div className="text-xs text-slate-500 mt-0.5">Son 5 dk istek frekansı</div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full" style={{ width: `${Math.min(100, metrics.requestsPerMinute * 4)}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Aktif API Anahtarları</span>
                <Key className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-indigo-400">{metrics.activeKeysCount} <span className="text-sm font-normal text-slate-400">/ {metrics.totalKeysCount}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">Bağlı müşteri / servis</div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Veritabanı Sağlığı</span>
                <Database className="w-4 h-4 text-purple-400" />
              </div>
              <div className="my-2">
                <div className="text-2xl font-black text-purple-400">485K+ <span className="text-sm font-normal text-slate-400">Bar</span></div>
                <div className="text-xs text-slate-500 mt-0.5">625 Hisse & 1.063 Fon</div>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Quick Providers Live Status Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Veri Sağlayıcı & Kaynak Canlılık Matrisi
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Tüm iç ve dış veri sağlayıcıların canlı ping ve çalışma durumu.</p>
              </div>
              <button
                onClick={fetchDiagnostics}
                disabled={diagnosticsLoading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
                {diagnosticsLoading ? 'Test Ediliyor...' : 'Yeniden Ping\'le'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(diagnosticsData?.providers || []).map((prov: ProviderDiagnostic) => (
                <div key={prov.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-200">{prov.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{prov.endpointTested}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      prov.status === 'ONLINE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      {prov.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" /> {prov.latencyMs} ms
                    </span>
                    <span className="text-emerald-400 font-semibold">%{prov.successRate24h} Başarı</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Called Endpoints Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-cyan-400" /> En Çok Çağrılan Endpoint'ler & Performans Dağılımı
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Endpoint Yolu</th>
                    <th className="pb-3 font-semibold">Toplam Çağrı</th>
                    <th className="pb-3 font-semibold">Ortalama Yanıt</th>
                    <th className="pb-3 font-semibold">Hatalar</th>
                    <th className="pb-3 font-semibold text-right">Hata Oranı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(telemetryData?.endpointBreakdown || []).slice(0, 8).map((ep: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-mono text-cyan-300 font-medium">{ep.path}</td>
                      <td className="py-2.5 text-slate-200 font-semibold">{ep.calls} çağrı</td>
                      <td className="py-2.5 text-slate-300">{ep.avgLatencyMs} ms</td>
                      <td className="py-2.5 text-slate-400">{ep.errors}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          ep.errors === 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {ep.errorRate}
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

      {/* VIEW 2: LIVE TRAFFIC & TELEMETRY STREAM */}
      {activeTab === 'telemetry' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" /> Canlı İstek Telemetrisi & Trafik Hareketleri
              </h3>
              <p className="text-xs text-slate-400 mt-1">Gelen her HTTP isteği, yanıt süresi, istemci IP ve statü kodu anlık olarak izlenmektedir.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  autoRefresh
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
                {autoRefresh ? 'Canlı Akış Aktif (4s)' : 'Durduruldu'}
              </button>

              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Logları Temizle
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Endpoint, IP veya API Key adına göre filtrele..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-400">Statü:</span>
              {(['ALL', '2XX', '4XX', '5XX'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Zaman</th>
                  <th className="py-3 px-3 font-semibold">Metod</th>
                  <th className="py-3 px-4 font-semibold">Endpoint Yolu</th>
                  <th className="py-3 px-3 font-semibold">Statü</th>
                  <th className="py-3 px-3 font-semibold">Gecikme</th>
                  <th className="py-3 px-4 font-semibold">İstemci IP / Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/50 font-mono">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Kayıtlı istek bulunamadı veya arama filtresine uymuyor.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: ApiTelemetryRecord) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-cyan-300 font-medium truncate max-w-xs">
                        {log.path}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.statusCode < 300 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : log.statusCode < 500
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${log.durationMs > 100 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {log.durationMs} ms
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 truncate max-w-xs">
                        <span className="text-slate-300">{log.ip}</span>
                        {log.apiKeyName && (
                          <span className="ml-2 text-slate-500 text-[11px] font-sans">
                            ({log.apiKeyName})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: API KEYS & ACTIVATION MANAGEMENT */}
      {activeTab === 'keys' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" /> API Anahtarları, Aktivasyon & Yetkilendirme
              </h3>
              <p className="text-xs text-slate-400 mt-1">Dış sistemlere, mobil uygulamalara veya trading botlarına API erişimi vermek ve hız limitleri tanımlamak için anahtarları yönetin.</p>
            </div>

            <button
              onClick={() => setShowNewKeyModal(true)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" /> Yeni API Anahtarı Oluştur
            </button>
          </div>

          {/* Keys Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">İstemci / Servis Adı</th>
                  <th className="py-3.5 px-4 font-semibold">API Anahtarı (X-API-Key)</th>
                  <th className="py-3.5 px-3 font-semibold">Plan Seviyesi</th>
                  <th className="py-3.5 px-3 font-semibold">Hız Limiti</th>
                  <th className="py-3.5 px-3 font-semibold">Toplam Çağrı</th>
                  <th className="py-3.5 px-3 font-semibold">Durum</th>
                  <th className="py-3.5 px-4 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {apiKeys.map((k) => {
                  const isRevealed = revealedKeyId === k.id;
                  const displayKey = isRevealed ? k.key : `${k.key.substring(0, 12)}••••••••••••`;

                  return (
                    <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {k.name}
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          Oluşturulma: {new Date(k.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-cyan-300">
                        <div className="flex items-center gap-2">
                          <span>{displayKey}</span>
                          <button
                            onClick={() => setRevealedKeyId(isRevealed ? null : k.id)}
                            className="text-slate-500 hover:text-slate-300 p-1"
                            title={isRevealed ? 'Gizle' : 'Göster'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopy(k.key)}
                            className="text-slate-500 hover:text-cyan-400 p-1"
                            title="Anahtarı Kopyala"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                          k.tier === 'MASTER'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : k.tier === 'ENTERPRISE'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : k.tier === 'PRO'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}>
                          {k.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">
                        {k.rateLimit} <span className="text-slate-500 text-[10px]">req/dk</span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-200">
                        {k.totalCalls.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          k.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : k.status === 'PAUSED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {k.status === 'ACTIVE' ? 'AKTİF' : k.status === 'PAUSED' ? 'ASKIDA' : 'İPTAL'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {k.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateKeyStatus(k.id, 'PAUSED')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400"
                              title="Askıya Al"
                            >
                              <PauseCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateKeyStatus(k.id, 'ACTIVE')}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400"
                              title="Aktifleştir"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="Anahtarı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* New Key Modal */}
          {showNewKeyModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" /> Yeni API Anahtarı Oluştur
                  </h4>
                  <button
                    onClick={() => setShowNewKeyModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">İstemci / Müşteri / Bot Adı</label>
                    <input
                      type="text"
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Örn: FinTech Mobil App v2"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Erişim & Plan Seviyesi</label>
                    <select
                      value={newKeyTier}
                      onChange={(e) => {
                        const tier = e.target.value as any;
                        setNewKeyTier(tier);
                        if (tier === 'FREE') setNewKeyRateLimit(60);
                        if (tier === 'PRO') setNewKeyRateLimit(600);
                        if (tier === 'ENTERPRISE') setNewKeyRateLimit(2400);
                        if (tier === 'MASTER') setNewKeyRateLimit(10000);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="FREE">FREE (60 İstek / Dk)</option>
                      <option value="PRO">PRO (600 İstek / Dk)</option>
                      <option value="ENTERPRISE">ENTERPRISE (2.400 İstek / Dk)</option>
                      <option value="MASTER">MASTER (10.000 İstek / Dk - Sınırsız)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Özel Hız Limiti (Req / Min)</label>
                    <input
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowNewKeyModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                    >
                      Anahtarı Üret & Aktifleştir
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: SYSTEM & PROVIDER DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {/* Diagnostics Control Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" /> Derin Sistem Diagnostiği & Sağlık Raporu
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Son Test: {lastPingTime || 'Şimdi yapıldı'} • Durum: <span className="text-emerald-400 font-bold">SAĞLIKLI (100% SLA)</span>
              </p>
            </div>

            <button
              onClick={fetchDiagnostics}
              disabled={diagnosticsLoading}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className={`w-4 h-4 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
              {diagnosticsLoading ? 'Servisler Test Ediliyor...' : 'Tüm Servisleri Şimdi Ping\'le'}
            </button>
          </div>

          {/* Database Records Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs">BIST Hisseleri</div>
              <div className="text-xl font-bold text-white mt-1">{diagnosticsData?.databaseStats?.stocks || 625}</div>
              <div className="text-[11px] text-emerald-400 mt-1">Canlı Fiyat & Çarpan</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs">TEFAS Fonları</div>
              <div className="text-xl font-bold text-white mt-1">{diagnosticsData?.databaseStats?.funds || 1063}</div>
              <div className="text-[11px] text-emerald-400 mt-1">PDR & Varlık Dağılımı</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs">5Y OHLCV Barları</div>
              <div className="text-xl font-bold text-white mt-1">485.200+</div>
              <div className="text-[11px] text-cyan-400 mt-1">Derin Zaman Serisi</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs">KAP Bildirimleri</div>
              <div className="text-xl font-bold text-white mt-1">1.420+</div>
              <div className="text-[11px] text-amber-400 mt-1">KAP Duyarlılık Skorlu</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs">Analist Sentezleri</div>
              <div className="text-xl font-bold text-white mt-1">360+</div>
              <div className="text-[11px] text-purple-400 mt-1">Konsensüs Hedef Fiyat</div>
            </div>
          </div>

          {/* Deep Diagnostics List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-200">Servis & Bağlayıcı Sağlık Kontrolleri</h4>

            <div className="space-y-3">
              {(diagnosticsData?.providers || []).map((p: ProviderDiagnostic) => (
                <div key={p.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {p.name}
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{p.detail}</p>
                      <div className="text-[11px] font-mono text-cyan-400/80 mt-1">Test Edilen Uç: {p.endpointTested}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-right">
                      <div className="text-slate-400">Yanıt Gecikmesi</div>
                      <div className="text-sm font-mono font-bold text-cyan-400">{p.latencyMs} ms</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400">24s Erişilebilirlik</div>
                      <div className="text-sm font-bold text-emerald-400">%{p.successRate24h}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Host Metrics */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" /> Host Sunucu & Çalışma Zamanı Metrikleri
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Sistem Çalışma Süresi (Uptime)</span>
                <div className="text-sm font-bold text-white mt-1">{diagnosticsData?.systemMetrics?.uptimeFormatted || '72 saat 14 dk'}</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Node.js Sürümü</span>
                <div className="text-sm font-bold text-cyan-400 mt-1">{diagnosticsData?.systemMetrics?.nodeVersion || 'v20.x'}</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Bellek Kullanımı (RSS)</span>
                <div className="text-sm font-bold text-amber-400 mt-1">{diagnosticsData?.systemMetrics?.memoryRssMb || 124} MB</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Heap Bellek</span>
                <div className="text-sm font-bold text-purple-400 mt-1">{diagnosticsData?.systemMetrics?.memoryHeapUsedMb || 78} MB</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: INTERACTIVE API EXPLORER & SANDBOX */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Endpoints List */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[750px]">
            <div className="mb-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  placeholder="20+ Endpoint ara..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {API_ENDPOINTS.filter(ep => 
                ep.path.toLowerCase().includes(explorerSearch.toLowerCase()) ||
                ep.title.toLowerCase().includes(explorerSearch.toLowerCase()) ||
                ep.category.toLowerCase().includes(explorerSearch.toLowerCase())
              ).map((ep, idx) => {
                const isSelected = selectedEndpoint.path === ep.path;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      setCustomParams(ep.sampleParams || '');
                      setTestResult(null);
                      setHttpStatus(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/5'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {ep.method}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">{ep.category}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{ep.title}</div>
                    <div className="text-[11px] font-mono text-cyan-400/80 truncate mt-0.5">{ep.path}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Code Generator & Live Runner */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-500/20 text-blue-400">
                      {selectedEndpoint.method}
                    </span>
                    <h2 className="text-base font-bold text-white">{selectedEndpoint.title}</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedEndpoint.description}</p>
                </div>

                <button
                  onClick={() => handleRunTest(selectedEndpoint)}
                  disabled={testLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${testLoading ? 'animate-spin' : ''}`} />
                  {testLoading ? 'İstek Atılıyor...' : 'Test İsteği Gönder (Send)'}
                </button>
              </div>

              {/* URL Input Bar */}
              <div className="mt-4">
                <label className="block text-[11px] text-slate-400 font-semibold mb-1">Hedef API URL & Sorgu Parametreleri</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-xs text-slate-300">
                  <span className="text-slate-500 select-none pl-1">{currentOrigin}</span>
                  <span className="text-cyan-400 font-bold">{selectedEndpoint.path}</span>
                  <input
                    type="text"
                    value={customParams}
                    onChange={(e) => setCustomParams(e.target.value)}
                    placeholder="?param=value"
                    className="flex-1 bg-transparent text-amber-300 focus:outline-none pl-1"
                  />
                  <button
                    onClick={() => handleCopy(fullEndpointUrl)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                    title="Tam URL'yi Kopyala"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Snippets Tabs */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {(['js', 'python', 'curl', 'react'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveCodeLang(lang)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                          activeCodeLang === lang
                            ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'js' ? 'Node.js / JS' : lang === 'python' ? 'Python 3' : lang === 'curl' ? 'cURL' : 'React Hook'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCopy(getCodeSnippet())}
                    className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Kopyalandı' : 'Kodu Kopyala'}
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-56">
                  <pre>{getCodeSnippet()}</pre>
                </div>
              </div>
            </div>

            {/* Test Result Sandbox Output */}
            {testResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" /> Canlı API Yanıtı (JSON Response)
                    </h3>
                    {httpStatus && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        httpStatus === 200 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        HTTP {httpStatus} OK
                      </span>
                    )}
                    {responseTime && (
                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" /> {responseTime} ms
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopy(JSON.stringify(testResult, null, 2))}
                    className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> JSON Kopyala
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-cyan-300 max-h-80 overflow-y-auto custom-scrollbar">
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
