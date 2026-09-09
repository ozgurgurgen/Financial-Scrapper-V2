import { DepartmentType, EventStatus } from '../services/AppEventBus.ts';

export interface DepartmentConfig {
  id: DepartmentType;
  title: string;
  subtitle: string;
  primaryColor: string;      // Tailwind color class for text/border/glow
  badgeBg: string;
  dotColor: string;
  avatarIcon: string;         // Descriptive emoji or icon identifier
  characterRole: string;
  deskLabel: string;
}

export interface EventAnimationConfig {
  department: DepartmentType;
  animation: 'file_paper' | 'pin_board' | 'glow_screen' | 'red_box_drop' | 'coffee_cup' | 'sparkle' | 'pulse';
  defaultStatus: EventStatus;
  durationMs: number;
}

export const DEPARTMENTS: Record<DepartmentType, DepartmentConfig> = {
  BORSA: {
    id: 'BORSA',
    title: 'Borsa & Fiyat Masası',
    subtitle: 'Yahoo Finance & BIST Market Service',
    primaryColor: 'text-blue-500 border-blue-500/40 bg-blue-500/10',
    badgeBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dotColor: '#3b82f6',
    avatarIcon: '📈',
    characterRole: 'Kıdemli Piyasa Analisti',
    deskLabel: 'BIST 100 / Yahoo Ticker Ekranı'
  },
  KAP: {
    id: 'KAP',
    title: 'KAP & Mevzuat Masası',
    subtitle: 'KAP Scraper, PDR Parser & Yapay Zeka (AI)',
    primaryColor: 'text-amber-500 border-amber-500/40 bg-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    dotColor: '#f59e0b',
    avatarIcon: '🔍',
    characterRole: 'Mevzuat & Kamuyu Aydınlatma Uzmanı',
    deskLabel: 'KAP Şirket Bildirimleri & PDR Dosyaları'
  },
  MERKEZ_BANKASI: {
    id: 'MERKEZ_BANKASI',
    title: 'Merkez Bankası Masası',
    subtitle: 'TCMB EVDS & FED FRED API',
    primaryColor: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    dotColor: '#10b981',
    avatarIcon: '🏛️',
    characterRole: 'Makroekonomist',
    deskLabel: 'EVDS Kurları & FED Faiz Panosu'
  },
  ARSIV: {
    id: 'ARSIV',
    title: 'Arşiv & Veritabanı Odası',
    subtitle: 'PostgreSQL, Drizzle & Varlık Eşleştirici',
    primaryColor: 'text-slate-400 border-slate-500/40 bg-slate-500/10',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    dotColor: '#94a3b8',
    avatarIcon: '🗄️',
    characterRole: 'Veritabanı Mimarı & Dosyalama',
    deskLabel: 'PostgreSQL Ana Varlık Kasası'
  },
  BACKFILL: {
    id: 'BACKFILL',
    title: 'Gece / Hafta Sonu Vardiyası',
    subtitle: 'Historical 5-Year Deep Backfill Robot',
    primaryColor: 'text-purple-500 border-purple-500/40 bg-purple-500/10',
    badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    dotColor: '#a855f7',
    avatarIcon: '🤖',
    characterRole: 'Anti-Ban Arşivleme Robotu',
    deskLabel: '5 Yıllık Derin Mum & NAV Kasası'
  },
  KRIPTO: {
    id: 'KRIPTO',
    title: 'Kripto Para Madenciliği & Ticker',
    subtitle: 'Binance & On-Chain Analytics',
    primaryColor: 'text-orange-500 border-orange-500/40 bg-orange-500/10',
    badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dotColor: '#f97316',
    avatarIcon: '⛏️',
    characterRole: 'Madenci Düğümü (Miner Node)',
    deskLabel: 'GPU Rig & Spot Fiyat Ticker'
  },
  HALKA_ARZ: {
    id: 'HALKA_ARZ',
    title: 'Halka Arz Masası',
    subtitle: 'SPK Bültenleri & Taslak İzahnameler',
    primaryColor: 'text-pink-500 border-pink-500/40 bg-pink-500/10',
    badgeBg: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    dotColor: '#ec4899',
    avatarIcon: '🚀',
    characterRole: 'Halka Arz Analisti',
    deskLabel: 'Talep Toplama & İzahname Onayları'
  },
  HABERLER: {
    id: 'HABERLER',
    title: 'Haber & Duyarlılık Merkezi',
    subtitle: 'Global Finans & Sentiment AI',
    primaryColor: 'text-cyan-500 border-cyan-500/40 bg-cyan-500/10',
    badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    dotColor: '#06b6d4',
    avatarIcon: '📰',
    characterRole: 'Haber Editörü & Yapay Zeka',
    deskLabel: 'RSS Bültenleri & AI Duyarlılık Panosu'
  },
  AMERIKA: {
    id: 'AMERIKA',
    title: 'Wall Street & ABD Piyasası',
    subtitle: 'NYSE & NASDAQ Top 1.000 Şirket',
    primaryColor: 'text-sky-400 border-sky-400/40 bg-sky-500/10',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    dotColor: '#0284c7',
    avatarIcon: '🗽',
    characterRole: 'Wall Street Kıdemli Trader',
    deskLabel: 'NYSE / NASDAQ Çift Bloomberg Terminali'
  },
  ETF_FONLARI: {
    id: 'ETF_FONLARI',
    title: 'Global Fon & ETF Masası',
    subtitle: 'SPY, QQQ, VOO, SCHD & Varlık Sepetleri',
    primaryColor: 'text-teal-400 border-teal-500/40 bg-teal-500/10',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    dotColor: '#14b8a6',
    avatarIcon: '🌐',
    characterRole: 'Küresel Portföy Yöneticisi',
    deskLabel: 'ETF Sepet Dağılımı & AUM Hologramı'
  }
};

export const OFFICE_EVENT_MAP: Record<string, EventAnimationConfig> = {
  US_STOCKS_SYNC_STARTED: {
    department: 'AMERIKA',
    animation: 'glow_screen',
    defaultStatus: 'BUSY',
    durationMs: 4000
  },
  US_STOCKS_SYNCED: {
    department: 'AMERIKA',
    animation: 'sparkle',
    defaultStatus: 'SUCCESS',
    durationMs: 3500
  },
  US_STOCKS_SYNC_ERROR: {
    department: 'AMERIKA',
    animation: 'red_box_drop',
    defaultStatus: 'ERROR',
    durationMs: 5000
  },
  US_ETF_SYNCED: {
    department: 'ETF_FONLARI',
    animation: 'glow_screen',
    defaultStatus: 'SUCCESS',
    durationMs: 3000
  },
  US_HISTORICAL_5Y_SYNCED: {
    department: 'BACKFILL',
    animation: 'pulse',
    defaultStatus: 'SUCCESS',
    durationMs: 4000
  },
  JOB_SCHEDULED_TRIGGER: {
    department: 'ARSIV',
    animation: 'pulse',
    defaultStatus: 'BUSY',
    durationMs: 3000
  },
  SYNC_STARTED: {
    department: 'BORSA',
    animation: 'glow_screen',
    defaultStatus: 'BUSY',
    durationMs: 4000
  },
  DATA_FETCH_INITIATED: {
    department: 'BORSA',
    animation: 'glow_screen',
    defaultStatus: 'BUSY',
    durationMs: 2500
  },
  DATA_FETCH_SUCCESS: {
    department: 'MERKEZ_BANKASI',
    animation: 'pin_board',
    defaultStatus: 'SUCCESS',
    durationMs: 2000
  },
  DATA_FETCH_FAILED: {
    department: 'ARSIV',
    animation: 'red_box_drop',
    defaultStatus: 'ERROR',
    durationMs: 5000
  },
  DATA_NORMALIZED: {
    department: 'MERKEZ_BANKASI',
    animation: 'pin_board',
    defaultStatus: 'SUCCESS',
    durationMs: 1500
  },
  ASSET_MATCH_SUCCESS: {
    department: 'ARSIV',
    animation: 'file_paper',
    defaultStatus: 'SUCCESS',
    durationMs: 2000
  },
  ASSET_MATCH_FAILED: {
    department: 'ARSIV',
    animation: 'red_box_drop',
    defaultStatus: 'ERROR',
    durationMs: 5000
  },
  DB_WRITE_BATCH_SUCCESS: {
    department: 'ARSIV',
    animation: 'file_paper',
    defaultStatus: 'SUCCESS',
    durationMs: 2500
  },
  AI_SUMMARIZE_TRIGGERED: {
    department: 'KAP',
    animation: 'glow_screen',
    defaultStatus: 'BUSY',
    durationMs: 4000
  },
  AI_QUOTA_COOLDOWN: {
    department: 'KAP',
    animation: 'coffee_cup',
    defaultStatus: 'COOLDOWN',
    durationMs: 10000
  },
  PDR_PARSE_COMPLETED: {
    department: 'KAP',
    animation: 'sparkle',
    defaultStatus: 'SUCCESS',
    durationMs: 3000
  },
  BACKFILL_PROGRESS_TICK: {
    department: 'BACKFILL',
    animation: 'glow_screen',
    defaultStatus: 'BUSY',
    durationMs: 2500
  },
  BACKFILL_WINDOW_STATUS: {
    department: 'BACKFILL',
    animation: 'pulse',
    defaultStatus: 'SUCCESS',
    durationMs: 3000
  },
  SETTINGS_UPDATED: {
    department: 'ARSIV',
    animation: 'file_paper',
    defaultStatus: 'SUCCESS',
    durationMs: 2000
  },
  USER_MANUAL_ACTION: {
    department: 'BORSA',
    animation: 'sparkle',
    defaultStatus: 'BUSY',
    durationMs: 3000
  },
  SYSTEM_HEALTH_CHECK: {
    department: 'ARSIV',
    animation: 'pulse',
    defaultStatus: 'SUCCESS',
    durationMs: 1500
  }
};
