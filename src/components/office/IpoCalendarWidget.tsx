import React from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  Flame, 
  Zap, 
  RefreshCw, 
  Layers,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

export interface IpoEvent {
  id: string | number;
  companyCode: string;
  companyName: string;
  status: 'APPROVED' | 'BOOK_BUILDING' | 'LISTED' | 'DRAFT';
  dateStr: string;
  countdownDays?: number;
  price?: string;
  lotSize?: string;
  sentiment?: 'YÜKSEK POTANSİYEL' | 'STANDART' | 'RİSKLİ';
  aiSummary?: string;
  ipoSize?: string | null;
  freeFloat?: string | null;
  priceStability?: string | null;
  lockupCommitment?: string | null;
  fundUsage?: string | null;
  discountRate?: string | null;
  allocationGroups?: string | null;
  currentPrice?: string | null;
  dayChangePct?: string | null;
  ceilingStreak?: number | null;
  maxCeilingStreak?: number | null;
  brokeCeiling?: boolean | null;
  breakDate?: string | null;
  totalReturnPct?: string | null;
  tradingDays?: number | null;
}

const statusConfig: Record<string, any> = {
  DRAFT: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Taslak' },
  APPROVED: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'SPK Onaylı' },
  BOOK_BUILDING: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Talep Toplanıyor' },
  LISTED: { icon: Building2, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Borsada İşlemde' }
};

const sentimentConfig: Record<string, any> = {
  'YÜKSEK POTANSİYEL': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'STANDART': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'RİSKLİ': 'text-rose-400 bg-rose-400/10 border-rose-400/30',
};

export const IpoCalendarWidget: React.FC<{ 
  isFullScreen?: boolean;
  onSelectIpo?: (ipo: IpoEvent) => void;
}> = ({ isFullScreen = false, onSelectIpo }) => {
  const [ipos, setIpos] = React.useState<IpoEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'ALL' | 'LISTED' | 'UPCOMING'>('ALL');
  const [isRefreshingTavan, setIsRefreshingTavan] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const fetchIpos = React.useCallback(() => {
    setLoading(true);
    fetch('/api/v1/ipos')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setIpos(data.data);
        }
      })
      .catch(err => console.error('Error fetching IPOs', err))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchIpos();
  }, [fetchIpos]);

  const handleRefreshTavan = async () => {
    setIsRefreshingTavan(true);
    try {
      await fetch('/api/v1/ipos/tavan/refresh', { method: 'POST' });
      fetchIpos();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingTavan(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/v1/ipos/sync', { method: 'POST' });
      setTimeout(fetchIpos, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const listedIpos = ipos.filter(i => i.status === 'LISTED' || (i.tradingDays && i.tradingDays > 0));
  const upcomingIpos = ipos.filter(i => i.status !== 'LISTED' && (!i.tradingDays || i.tradingDays === 0));

  const filteredIpos = filter === 'LISTED' 
    ? listedIpos 
    : filter === 'UPCOMING' 
      ? upcomingIpos 
      : ipos;

  return (
    <div className={`w-full mt-4 bg-neutral-900/60 border border-neutral-700/50 rounded-xl p-3 sm:p-4 ${isFullScreen ? 'min-h-[500px]' : 'max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sticky top-0 bg-neutral-900/95 py-2 z-10 backdrop-blur-md border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-pink-500" />
          <div>
            <h4 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              Halka Arz & BIST Tavan Serisi Takipçisi
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                Canlı Veri
              </span>
            </h4>
            <p className="text-[11px] text-neutral-400">
              KAP, SPK izahnameleri ve Borsa İstanbul anlık tavan serisi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefreshTavan}
            disabled={isRefreshingTavan}
            title="Borsa İstanbul canlı fiyat ve tavan serilerini tazele"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshingTavan ? 'animate-spin' : ''} />
            <span>{isRefreshingTavan ? 'Tavanlar Taranıyor...' : 'Tavanları Yenile'}</span>
          </button>

          <button 
            onClick={handleSyncAll}
            disabled={isSyncing}
            title="Halka arz listesini ve izahnameleri senkronize et"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded border border-pink-500/30 transition-colors disabled:opacity-50"
          >
            <Activity size={12} className={isSyncing ? 'animate-pulse' : ''} />
            <span>{isSyncing ? 'Senkronize...' : 'Tam Tarama'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-neutral-800 text-white border border-neutral-600 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Layers size={13} />
          <span>Tümü ({ipos.length})</span>
        </button>

        <button
          onClick={() => setFilter('LISTED')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            filter === 'LISTED'
              ? 'bg-purple-950/60 text-purple-200 border border-purple-700/50 shadow-sm'
              : 'text-neutral-400 hover:text-purple-300 hover:bg-purple-950/20'
          }`}
        >
          <Flame size={13} className="text-amber-400" />
          <span>Borsada & Tavan Takibi ({listedIpos.length})</span>
        </button>

        <button
          onClick={() => setFilter('UPCOMING')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            filter === 'UPCOMING'
              ? 'bg-blue-950/60 text-blue-200 border border-blue-700/50 shadow-sm'
              : 'text-neutral-400 hover:text-blue-300 hover:bg-blue-950/20'
          }`}
        >
          <Clock size={13} />
          <span>Talep Toplanan / Onaylananlar ({upcomingIpos.length})</span>
        </button>
      </div>
      
      {/* IPO List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-12 text-neutral-400 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-pink-500" />
            <span>Gerçek halka arz ve BIST tavan verileri yükleniyor...</span>
          </div>
        ) : filteredIpos.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 text-sm bg-neutral-900/40 rounded-lg border border-neutral-800">
            Seçilen kritere uygun halka arz kaydı bulunamadı.
          </div>
        ) : (
          filteredIpos.map((ipo, idx) => {
            const StatusIcon = statusConfig[ipo.status]?.icon || Clock;
            const statusStyle = statusConfig[ipo.status] || statusConfig.DRAFT;
            const isTraded = ipo.status === 'LISTED' || (ipo.tradingDays && ipo.tradingDays > 0);
            const isPositiveChange = ipo.dayChangePct && !ipo.dayChangePct.startsWith('-');
            const isTotalPositive = ipo.totalReturnPct && !ipo.totalReturnPct.startsWith('-');

            return (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                key={ipo.id} 
                className="bg-neutral-800/80 rounded-xl border border-neutral-700/80 p-3.5 hover:border-pink-500/50 transition-all shadow-md"
              >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base tracking-wide">{ipo.companyCode}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${statusStyle.bg} ${statusStyle.color}`}>
                        <StatusIcon size={11} />
                        {statusStyle.label}
                      </span>

                      {/* Tavan Serisi Rozeti */}
                      {isTraded && ipo.ceilingStreak !== undefined && ipo.ceilingStreak !== null && (
                        ipo.ceilingStreak > 0 && !ipo.brokeCeiling ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                            <Flame size={11} className="text-amber-400" />
                            {ipo.ceilingStreak}. Gün Tavan Serisi
                          </span>
                        ) : ipo.brokeCeiling ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-neutral-700/50 text-neutral-300 border border-neutral-600 flex items-center gap-1">
                            <Zap size={10} className="text-amber-400" />
                            {ipo.breakDate ? `${ipo.breakDate} Tavan Bozdu` : 'Tavan Bozdu'}
                            {ipo.maxCeilingStreak ? ` (En Yüksek: ${ipo.maxCeilingStreak} Gün)` : ''}
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1 font-medium">{ipo.companyName}</div>
                  </div>

                  {/* Right side status / countdown */}
                  {ipo.countdownDays !== undefined && ipo.countdownDays > 0 && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-neutral-500">Listelenmeye</span>
                      <span className="text-base font-bold text-pink-400 font-mono">{ipo.countdownDays} Gün</span>
                    </div>
                  )}
                </div>

                {/* Real-time BIST Tavan & Canlı Fiyat Paneli */}
                {isTraded && (
                  <div className="mb-2.5 bg-gradient-to-r from-purple-950/40 via-neutral-900/60 to-neutral-900/40 p-2.5 rounded-lg border border-purple-800/40">
                    <div className="text-[10px] uppercase font-mono font-bold text-purple-300 flex items-center gap-1 mb-1.5">
                      <Activity size={12} className="text-purple-400" />
                      Borsa İstanbul Canlı Fiyat & Tavan İstatistiği
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="flex flex-col bg-neutral-900/70 p-1.5 rounded border border-neutral-800">
                        <span className="text-[9px] text-neutral-500 font-mono">ANLIK FİYAT</span>
                        <span className="text-white font-bold font-mono">{ipo.currentPrice || '-'}</span>
                      </div>

                      <div className="flex flex-col bg-neutral-900/70 p-1.5 rounded border border-neutral-800">
                        <span className="text-[9px] text-neutral-500 font-mono">GÜNLÜK DEĞİŞİM</span>
                        <div className="flex items-center gap-1 font-bold font-mono">
                          {isPositiveChange ? (
                            <TrendingUp size={12} className="text-emerald-400" />
                          ) : (
                            <TrendingDown size={12} className="text-rose-400" />
                          )}
                          <span className={isPositiveChange ? 'text-emerald-400' : 'text-rose-400'}>
                            {ipo.dayChangePct || '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col bg-neutral-900/70 p-1.5 rounded border border-neutral-800">
                        <span className="text-[9px] text-neutral-500 font-mono">HALKA ARZDAN GETİRİ</span>
                        <span className={`font-bold font-mono ${isTotalPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ipo.totalReturnPct || '-'}
                        </span>
                      </div>

                      <div className="flex flex-col bg-neutral-900/70 p-1.5 rounded border border-neutral-800">
                        <span className="text-[9px] text-neutral-500 font-mono">İŞLEM GÜNÜ</span>
                        <span className="text-neutral-200 font-mono font-medium">
                          {ipo.tradingDays ? `${ipo.tradingDays} Seans` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* General IPO info */}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 bg-neutral-900/50 p-2 rounded-lg border border-neutral-800/80">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-500 font-mono">HALKA ARZ TARİHİ</span>
                    <span className="text-neutral-300 font-medium">{ipo.dateStr}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-500 font-mono">ARZ FİYATI / DAĞITIM</span>
                    <span className="text-neutral-300 font-medium">{ipo.price || '-'} • {ipo.lotSize || '-'}</span>
                  </div>
                </div>
                
                {/* Detailed Financial Signals */}
                {(ipo.ipoSize || ipo.discountRate || ipo.freeFloat || ipo.priceStability || ipo.lockupCommitment) && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] mb-2.5 bg-neutral-900/30 p-2 rounded-lg border border-neutral-800/50">
                    {ipo.ipoSize && (
                      <div className="flex flex-col">
                        <span className="text-neutral-500 font-mono">ARZ BÜYÜKLÜĞÜ</span>
                        <span className="text-neutral-300 font-medium">{ipo.ipoSize.replace(/\*\*/g, '').trim()}</span>
                      </div>
                    )}
                    {ipo.discountRate && (
                      <div className="flex flex-col">
                        <span className="text-neutral-500 font-mono">İSKONTO ORANI</span>
                        <span className="text-emerald-400 font-medium">{ipo.discountRate}</span>
                      </div>
                    )}
                    {ipo.freeFloat && (
                      <div className="flex flex-col">
                        <span className="text-neutral-500 font-mono">HALKA AÇIKLIK</span>
                        <span className="text-neutral-300 font-medium">{ipo.freeFloat}</span>
                      </div>
                    )}
                    {ipo.priceStability && (
                      <div className="flex flex-col">
                        <span className="text-neutral-500 font-mono">FİYAT İSTİKRARI</span>
                        <span className="text-neutral-300 font-medium">{ipo.priceStability}</span>
                      </div>
                    )}
                    {ipo.lockupCommitment && (
                      <div className="flex flex-col col-span-2">
                        <span className="text-neutral-500 font-mono">SATMAMA TAAHHÜDÜ</span>
                        <span className="text-neutral-300">{ipo.lockupCommitment}</span>
                      </div>
                    )}
                    {ipo.fundUsage && (
                      <div className="flex flex-col col-span-2 mt-1">
                        <span className="text-neutral-500 font-mono">FON KULLANIM YERLERİ</span>
                        <span className="text-neutral-300 leading-tight">{ipo.fundUsage}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* AI Summary */}
                {ipo.aiSummary && (
                  <div className="mt-2 text-[11px] bg-neutral-900/40 p-2 rounded-lg border border-neutral-800/60">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-cyan-400 font-bold flex items-center gap-1 text-[10px]">
                        <HelpCircle size={11} /> AI İZAHNAME DEĞERLENDİRMESİ:
                      </span>
                      {ipo.sentiment && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${sentimentConfig[ipo.sentiment]}`}>
                          {ipo.sentiment}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 leading-relaxed italic border-l-2 border-cyan-700/60 pl-2 ml-0.5">
                      "{ipo.aiSummary}"
                    </p>
                  </div>
                )}

                {/* Halka Arz Detay Sayfası Butonu */}
                {onSelectIpo && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-700/60 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">
                      BIST Kodu: <strong className="text-neutral-200 font-mono">{ipo.companyCode}</strong>
                    </span>
                    <button
                      id={`btn-ipo-detail-${ipo.companyCode.toLowerCase()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIpo(ipo);
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Detaylı İzahname & Analiz Sayfası</span>
                      <span>→</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

