import { useState, useEffect } from 'react';
import { TabType } from '../types';
import { RefreshCw, Activity, Radio, Menu } from 'lucide-react';

interface HeaderProps {
  currentTab: TabType;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
}

const TAB_TITLES: Record<TabType, { title: string; desc: string }> = {
  services: { title: 'Servisler (Services) — Genel Bakış', desc: 'KAP, TEFAS ve Piyasa worker süreçlerinin durum ve orkestrasyonu' },
  'live-office': { title: 'Canlı Ofis Simülasyonu (Live Office)', desc: 'Sistem servislerinin ve arka plan veri robotlarının gerçek zamanlı operasyon katı' },
  dataflow: { title: 'Veri Akışı (Data Flow) & Loglar', desc: 'Canlı akış konsolu, işlem geçmişi, rate limit ve IP durumları' },
  funds: { title: 'TEFAS Fonları (Funds Explorer)', desc: '2,598 fonun fiyat hareketleri, getirileri ve teknik özetleri' },
  'fund-holdings': { title: 'Fon Portföy & Dağılım (Holdings)', desc: 'Fonların hisse senedi ağırlıkları ve kaldıraçlı portföy oranları' },
  market: { title: 'Piyasa Verileri (Market Data)', desc: 'Döviz kurları, altın, emtia, kripto paralar ve VAP göstergeleri' },
  crypto: { title: 'Kripto & On-Chain (CryptoCompare & IntoTheBlock)', desc: 'Akıllı delta güncellemeli OHLCV mumları, yerel RSI/MACD, zincir üstü sinyaller ve haber duyarlılığı' },
  'crypto-all': { title: 'Kripto Listesi (Top 500)', desc: 'Binance API ile çekilen en yüksek hacimli 500 kripto varlığın anlık verileri' },
  kap: { title: 'KAP Verileri (Disclosures & Companies)', desc: 'BIST bildirimleri, şirket profilleri, temettü, geri alım ve halka arz' },
  ipo: { title: 'Halka Arz & İzahname (IPO)', desc: 'SPK Bülteni ve KAP bildirimlerinden anlık IPO takvimi ve AI özetleri' },
  news: { title: 'Piyasa & Finans Haberleri (Financial News)', desc: 'BIST, makroekonomi, küresel piyasalar, halka arz ve kripto haber akışı ve AI duyarlılık analizi' },
  schedule: { title: 'Zamanlayıcı (Scheduler Ayarları)', desc: 'Worker servislerinin periyodik çalışma saatleri ve cron kuralları' },
  technical: { title: 'Teknik Analiz (Technical Analysis)', desc: 'RSI, MACD, Bollinger Bantları, Supertrend ve Pivot hesaplamaları' },
  screener: { title: 'Hisse Tarama (Stock Screener)', desc: 'Hazır filtre setleri ile aşırı satım/alım ve momentum taramaları' },
  macro: { title: 'Makro Veri (Macro & Inflation)', desc: 'TCMB TÜFE ve ÜFE enflasyon trendleri, gösterge kurları' },
  calendar: { title: 'Ekonomik Takvim (Economic Calendar)', desc: 'Küresel merkez bankaları ve makroekonomik duyuru takvimi' },
  buffett: { title: 'Buffett & DCF Değerleme Modeli', desc: 'Owner Earnings, güvenlik marjı ve indirgenmiş nakit akımı analizi' },
  us: { title: 'ABD Piyasaları (US Stocks)', desc: 'S&P 500 ve Nasdaq hisseleri, değerleme oranları ve çarpanlar' },
  analyst: { title: 'Analist Yorumları & Araştırma Masası', desc: 'BIST, ABD, TEFAS ve Kripto analist notlarının telif korumalı Yapay Zeka Sentezi' },
  'api-charts': { title: 'API Grafik & Telemetri Analitiği', desc: 'İstek hacimleri, gecikme yüzdelikleri, pazar dağılımı, müşteri kota tüketimi ve tam API rehberi' },
  'system-logs': { title: 'Kapsamlı Sistem & Hata Loglama Merkezi', desc: 'API hataları, veri bağdaştırıcıları, stack trace kayıtları ve denetim izleme merkezi' },
  api: { title: 'API Yönetimi, Telemetri & Sistem Diagnostiği', desc: 'Canlı istek akışı, API anahtarları, SLA metrikleri, master aktivasyon switchi ve interaktif sandbox' },
  agents: { title: 'Otonom AI Ajan Entegrasyonu (OpenClaw, Harness & MCP)', desc: 'OpenClaw, Harness ve Anthropic MCP ajanları için canlı tool, manifest ve RPC fonksiyon çağırma merkezi' },
  settings: { title: 'Ayarlar & Senkronizasyon', desc: 'Sistem yapılandırması ve API anahtarları' },
  'data-health': { title: 'Veri Kaynakları & Sıfır Kesinti Kalkanı', desc: 'Canlı sağlık durumu, 24s heatmap, failover denetimi ve 6 katmanlı kesintisiz veri zırhı' },
  assets: { title: '360° Varlık Veri Eşleştirme & İstihbarat Merkezi', desc: 'Analist yorumları, TEFAS kurumsal fon sahipliği, KAP ve Buffett DCF ile sıfır boşta veri' },
  'sector-analytics': { title: 'Sektörel İstihbarat & Rotasyon Hub', desc: 'Sektörel kurumsal para akışı, iskonto matrisi, analist hedef getiri haritası ve KAP bildirimleri' },
  db_stocks: { title: 'Hisse Senedi (DB)', desc: 'Veritabanındaki hisse senedi listesi' }
};

export default function Header({ 
  currentTab, 
  onRefresh, 
  isRefreshing,
  onToggleMobileNav 
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const meta = TAB_TITLES[currentTab] || { title: 'Dashboard', desc: '' };

  return (
    <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileNav}
          className="p-2 -ml-1 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden shrink-0 transition-colors"
          title="Menüyü Aç"
          aria-label="Menüyü Aç"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
            {meta.title}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate hidden sm:block">
            {meta.desc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-xs border border-neutral-200/50 dark:border-neutral-700/50">
          <Activity size={13} className="text-cyan-500" />
          <span>{timeStr || '12:00:00'}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Verileri Yenile"
          className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-blue-500' : ''} />
        </button>
      </div>
    </header>
  );
}
