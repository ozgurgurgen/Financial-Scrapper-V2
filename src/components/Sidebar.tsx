import React, { useState, useEffect } from 'react';
import { TabType } from '../types';
import axios from 'axios';
import { 
  Server, 
  Activity, 
  Briefcase, 
  PieChart, 
  Globe, 
  FileText, 
  Clock, 
  LineChart, 
  Search, 
  TrendingDown, 
  Calendar, 
  Award, 
  DollarSign, 
  Code2, 
  Moon, 
  Sun,
  ShieldCheck,
  ChevronRight,
  Database,
  Settings,
  Layers,
  Coins,
  Building2,
  Newspaper,
  Radio,
  BarChart3,
  Terminal,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavGroup {
  title: string;
  items: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[];
}

export default function Sidebar({ 
  currentTab, 
  onSelectTab, 
  isDark, 
  onToggleTheme,
  isMobileOpen = false,
  onCloseMobile 
}: SidebarProps) {
  const [appName, setAppName] = useState<string>('Financial Scraper');
  const [appLogo, setAppLogo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async (retryCount = 0) => {
      try {
        const response = await axios.get('/api/settings', { timeout: 8000 });
        if (response.data && isMounted) {
          const nameSetting = response.data['app_name'];
          const logoSetting = response.data['app_logo'];
          
          if (nameSetting) {
            setAppName(typeof nameSetting === 'object' ? (nameSetting.value || nameSetting) : nameSetting);
          }
          if (logoSetting) {
            setAppLogo(typeof logoSetting === 'object' ? (logoSetting.value || logoSetting) : logoSetting);
          }
        }
      } catch (error) {
        // Retry softly once after 3 seconds if first load was cold
        if (retryCount < 1 && isMounted) {
          setTimeout(() => fetchSettings(retryCount + 1), 3000);
        }
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, [currentTab]); // Refresh when tab changes to stay somewhat updated

  const groups: NavGroup[] = [
    {
      title: 'BORU HATTI & ORKESTRASYON',
      items: [
        { id: 'services', label: 'Servisler (Genel Bakış)', icon: <Server size={18} /> },
        { id: 'data-health', label: 'Veri Sağlığı & Kurtarma', icon: <Radio size={18} />, badge: 'AI Keşif' },
        { id: 'live-office', label: 'Canlı Ofis Simülasyonu', icon: <Building2 size={18} />, badge: 'CANLI' },
        { id: 'dataflow', label: 'DB Grafikleri & Veri Akışı', icon: <Activity size={18} />, badge: 'Grafik & Export' },
        { id: 'schedule', label: 'Zamanlayıcı (Scheduler)', icon: <Clock size={18} /> },
      ]
    },
    {
      title: 'TEFAS & FONLAR',
      items: [
        { id: 'funds', label: 'TEFAS Fonları', icon: <Briefcase size={18} /> },
        { id: 'fund-holdings', label: 'Fon Portföy & Dağılım', icon: <PieChart size={18} />, badge: 'Hisseli' },
      ]
    },
    {
      title: 'KAP & BIST',
      items: [
        { id: 'db_stocks', label: '625+ BIST Hisse Evreni', icon: <Database size={18} />, badge: '625+' },
        { id: 'kap', label: 'KAP Verileri & Şirketler', icon: <FileText size={18} />, badge: '5 Modül' },
        { id: 'ipo', label: 'Halka Arz & İzahname (IPO)', icon: <Calendar size={18} />, badge: 'YENİ' },
        { id: 'news', label: 'Piyasa & Finans Haberleri', icon: <Newspaper size={18} />, badge: 'CANLI' },
        { id: 'market', label: 'Piyasa & VAP Göstergeleri', icon: <Globe size={18} /> },
      ]
    },
    {
      title: 'KRİPTO & ON-CHAIN',
      items: [
        { id: 'crypto', label: 'Kripto (Özet)', icon: <Coins size={18} />, badge: 'Delta DB' },
        { id: 'crypto-all', label: 'Kripto Listesi (Top 500)', icon: <Coins size={18} /> },
      ]
    },
    {
      title: 'ANALİZ & ARAŞTIRMA',
      items: [
        { id: 'sector-analytics', label: 'Sektörel Analitik & Isı Haritası', icon: <PieChart size={18} />, badge: 'Isı Haritası' },
        { id: 'analyst', label: 'Analist Yorumları & Konsensüs', icon: <FileText size={18} />, badge: 'YZ Sentez' },
        { id: 'technical', label: 'Teknik Analiz', icon: <LineChart size={18} /> },
        { id: 'screener', label: 'Hisse Tarama (Screener)', icon: <Search size={18} /> },
        { id: 'buffett', label: 'Buffett & DCF Değerleme', icon: <Award size={18} /> },
      ]
    },
    {
      title: 'MAKRO & KÜRESEL',
      items: [
        { id: 'macro', label: 'Makro & TÜFE Enflasyon', icon: <TrendingDown size={18} /> },
        { id: 'calendar', label: 'Ekonomik Takvim', icon: <Calendar size={18} /> },
        { id: 'us', label: 'ABD Piyasaları', icon: <DollarSign size={18} /> },
      ]
    },
    {
      title: 'GELİŞTİRİCİ & API HUB',
      items: [
        { id: 'system-logs', label: 'Sistem & Hata Logları', icon: <Terminal size={18} />, badge: 'DENETİM' },
        { id: 'api-charts', label: 'API Grafik & Telemetri', icon: <BarChart3 size={18} />, badge: 'GRAFİK' },
        { id: 'api', label: 'API Yönetimi & Diagnostik', icon: <Code2 size={18} />, badge: 'YÖNETİM & LOG' },
      ]
    },
    {
      title: 'SİSTEM',
      items: [
        { id: 'assets', label: '360° Varlık Eşleştirme', icon: <Layers size={18} />, badge: '360° Hub' },
        { id: 'settings', label: 'Ayarlar & Senkronizasyon', icon: <Settings size={18} /> },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 lg:static lg:w-68 h-screen flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 select-none transition-transform duration-200 ease-in-out shrink-0 ${
        isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 overflow-hidden shrink-0">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="w-full h-full object-cover bg-white" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = appName.substring(0,2).toUpperCase(); }} />
              ) : (
                <span>{appName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                {appName}
              </h1>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span> v2.4
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            title="Menüyü Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="text"
              placeholder="Menüde ara... (örn: Analiz, Sektör, Fon)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 border border-transparent focus:border-blue-500 rounded-lg text-xs outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-3 text-xs">
        {groups
          .map((grp) => {
            const filteredItems = grp.items.filter((item) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                item.label.toLowerCase().includes(q) ||
                grp.title.toLowerCase().includes(q) ||
                (item.badge && item.badge.toLowerCase().includes(q))
              );
            });
            return { ...grp, items: filteredItems };
          })
          .filter((grp) => grp.items.length > 0)
          .map((grp, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 pt-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              {grp.title}
            </div>
            {grp.items.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-blue-600'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Footer Controls */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
        <div className="flex items-center justify-between px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-600 dark:text-neutral-300 text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>PostgreSQL Shared DB</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">BAĞLI</span>
        </div>

        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-500" />}
            <span>{isDark ? 'Açık Tema (Light)' : 'Koyu Tema (Dark)'}</span>
          </div>
          <ChevronRight size={14} className="text-neutral-400" />
        </button>
      </div>
    </aside>
    </>
  );
}
