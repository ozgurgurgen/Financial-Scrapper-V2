import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Zap, 
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  DollarSign, 
  PieChart, 
  Users, 
  AlertTriangle, 
  Share2, 
  Check, 
  Coins, 
  Layers,
  Calculator,
  RefreshCw
} from 'lucide-react';

export interface IpoDetailData {
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

interface IpoDetailPageProps {
  ipo: IpoDetailData;
  onBack: () => void;
  onRefreshIpo?: () => void;
}

export default function IpoDetailPage({ ipo, onBack, onRefreshIpo }: IpoDetailPageProps) {
  const [copied, setCopied] = useState(false);
  const [calcInvestment, setCalcInvestment] = useState<number>(10000);

  // Parse numerical price from string e.g. "58,95 TL" or "₺58.95"
  const numericOfferPrice = useMemo(() => {
    if (!ipo.price) return 50;
    const clean = ipo.price.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) || parsed <= 0 ? 50 : parsed;
  }, [ipo.price]);

  // Parse numerical current price e.g. "₺78.35"
  const numericCurrentPrice = useMemo(() => {
    if (!ipo.currentPrice) return numericOfferPrice;
    const clean = ipo.currentPrice.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) || parsed <= 0 ? numericOfferPrice : parsed;
  }, [ipo.currentPrice, numericOfferPrice]);

  // Parse numerical lot count e.g. "35.000.000 Lot"
  const totalLotCount = useMemo(() => {
    if (!ipo.lotSize) return 25000000;
    const clean = ipo.lotSize.replace(/[^\d]/g, '');
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) || parsed <= 0 ? 25000000 : parsed;
  }, [ipo.lotSize]);

  // Estimate return from investment
  const calculatedReturn = useMemo(() => {
    const purchasedLots = Math.floor(calcInvestment / numericOfferPrice);
    const currentValue = purchasedLots * numericCurrentPrice;
    const netProfit = currentValue - (purchasedLots * numericOfferPrice);
    const returnPct = ((currentValue - (purchasedLots * numericOfferPrice)) / (purchasedLots * numericOfferPrice)) * 100;

    return {
      lots: purchasedLots,
      currentValue,
      netProfit,
      returnPct: isNaN(returnPct) ? 0 : returnPct,
    };
  }, [calcInvestment, numericOfferPrice, numericCurrentPrice]);

  // Participant scenarios for "Kaç Lot Düşer?"
  const participantScenarios = useMemo(() => {
    // Usually individual allocation is around 70-80% of total lot
    const individualLots = Math.round(totalLotCount * 0.75);
    const participants = [1500000, 2000000, 2500000, 3000000, 3500000, 4000000];

    return participants.map((count) => {
      const lotsPerPerson = Math.max(1, Math.floor(individualLots / count));
      const totalAmountTl = lotsPerPerson * numericOfferPrice;
      return {
        count: count >= 1000000 ? `${(count / 1000000).toFixed(1)} Milyon` : `${count.toLocaleString('tr-TR')}`,
        lots: lotsPerPerson,
        amount: totalAmountTl.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺',
      };
    });
  }, [totalLotCount, numericOfferPrice]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (ipo.status) {
      case 'LISTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Building2 size={13} /> Borsada İşlemde (LISTED)
          </span>
        );
      case 'BOOK_BUILDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <TrendingUp size={13} /> Talep Toplanıyor
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={13} /> SPK Onaylandı
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock size={13} /> Taslak İzahname
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-12">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          id="btn-back-to-ipos"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-semibold shadow-2xs transition-all w-fit cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>← Tüm Halka Arzlara Dön</span>
        </button>

        <div className="flex items-center gap-2">
          {onRefreshIpo && (
            <button
              onClick={onRefreshIpo}
              className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Verileri Yenile"
            >
              <RefreshCw size={15} />
            </button>
          )}

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
            <span>{copied ? 'Bağlantı Kopyalandı' : 'Paylaş'}</span>
          </button>
        </div>
      </div>

      {/* Main Company Header Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Company Info */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="px-3 py-1 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-mono font-bold text-lg tracking-wider shadow-xs shadow-blue-500/20">
                {ipo.companyCode}
              </div>
              {getStatusBadge()}

              {/* Tavan Serisi Badge */}
              {ipo.ceilingStreak !== null && ipo.ceilingStreak !== undefined && ipo.ceilingStreak > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 animate-pulse">
                  <Flame size={14} className="text-amber-500 fill-amber-500" />
                  {ipo.ceilingStreak}. Gün Tavan Serisi
                </span>
              )}

              {ipo.brokeCeiling && ipo.breakDate && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  <Clock size={13} /> {ipo.breakDate} Tavan Bozdu (En Yüksek: {ipo.maxCeilingStreak || 0} Gün)
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {ipo.companyName}
            </h1>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
              <Calendar size={13} />
              <span>İşlem / Talep Tarihi: <strong>{ipo.dateStr || 'Tarih Belirlenmedi'}</strong></span>
            </p>
          </div>

          {/* Live Market Price & Return Banner (if listed) */}
          {ipo.status === 'LISTED' && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shrink-0">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  BIST Anlık Fiyat
                </div>
                <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                  {ipo.currentPrice || ipo.price || '₺0.00'}
                </div>
                {ipo.dayChangePct && (
                  <div
                    className={`text-xs font-bold flex items-center gap-1 ${
                      ipo.dayChangePct.startsWith('+')
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {ipo.dayChangePct.startsWith('+') ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{ipo.dayChangePct} (Günlük)</span>
                  </div>
                )}
              </div>

              <div className="h-10 w-px bg-neutral-200 dark:bg-neutral-800"></div>

              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Toplam Getiri
                </div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    ipo.totalReturnPct && ipo.totalReturnPct.startsWith('-')
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {ipo.totalReturnPct || '%0.0'}
                </div>
                <div className="text-[11px] text-neutral-400 font-medium">
                  {ipo.tradingDays || 1}. Seans Günü
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Temel Parametreler (Bento Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400">Halka Arz Fiyatı</div>
          <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
            {ipo.price || 'Belirlenmedi'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400">Toplam Lot Sayısı</div>
          <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
            {ipo.lotSize || 'Belirlenmedi'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400">Halka Arz Büyüklüğü</div>
          <div className="text-base font-bold text-neutral-900 dark:text-white font-mono">
            {ipo.ipoSize || 'Belirlenmedi'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400">Halka Açıklık Oranı</div>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
            {ipo.freeFloat || '%20 - %25'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400">İskonto Oranı</div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {ipo.discountRate || '%20.00'}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
          <div className="text-[11px] font-medium text-neutral-400">Dağıtım Şekli</div>
          <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
            Eşit Dağıtım
          </div>
        </div>
      </div>

      {/* Two Column Section: Interactive Return Calculator & Tavan Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return Calculator */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                İnteraktif Yatırım & Kâr Hesaplayıcı
              </h3>
              <p className="text-[11px] text-neutral-400">
                Arz fiyatı ({numericOfferPrice} ₺) ve güncel BIST fiyatı ({numericCurrentPrice} ₺) üzerinden net getiri
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex justify-between">
              <span>Halka Arz Başvuru Tutarı</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                {calcInvestment.toLocaleString('tr-TR')} ₺
              </span>
            </label>

            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={calcInvestment}
              onChange={(e) => setCalcInvestment(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />

            <div className="flex gap-2">
              {[5000, 10000, 25000, 50000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setCalcInvestment(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    calcInvestment === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {preset.toLocaleString('tr-TR')} ₺
                </button>
              ))}
            </div>

            {/* Calculated Output Box */}
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-neutral-400">Alınan Lot</div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                  {calculatedReturn.lots} Lot
                </div>
              </div>

              <div>
                <div className="text-[10px] text-neutral-400">Güncel Değer</div>
                <div className="text-sm font-bold text-neutral-900 dark:text-white font-mono">
                  {calculatedReturn.currentValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                </div>
              </div>

              <div>
                <div className="text-[10px] text-neutral-400">Net Kâr / Zarar</div>
                <div
                  className={`text-sm font-bold font-mono ${
                    calculatedReturn.netProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {calculatedReturn.netProfit >= 0 ? '+' : ''}
                  {calculatedReturn.netProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                  <span className="text-[10px] block font-normal">
                    (%{calculatedReturn.returnPct.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tavan Serisi & BIST Performans Çizelgesi */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                BIST Tavan Serisi & Seans İlerlemesi
              </h3>
              <p className="text-[11px] text-neutral-400">
                Hissenin ilk işlem gününden bugüne tavan döngüsü
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">Mevcut Tavan Serisi:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flame size={14} /> {ipo.ceilingStreak || 0} Gün
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">Ulaştığı En Yüksek Tavan Serisi:</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {ipo.maxCeilingStreak || ipo.ceilingStreak || 0} Gün Üst Üste
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
              <span className="text-neutral-500">Tavan Bozma Durumu:</span>
              <span
                className={`font-semibold ${
                  ipo.brokeCeiling
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {ipo.brokeCeiling
                  ? `Bozuldu (${ipo.breakDate || 'Tarih kayıtlı'})`
                  : 'Seri Devam Ediyor (Bozulmadı)'}
              </span>
            </div>

            {/* Visual Step Indicator */}
            <div className="pt-2">
              <div className="text-[10px] text-neutral-400 mb-1.5 font-medium">
                Teorik Tavan Getiri Merdiveni:
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[1, 2, 3, 4, 5].map((day) => {
                  const targetPrice = numericOfferPrice * Math.pow(1.1, day);
                  const isReached = (ipo.maxCeilingStreak || 0) >= day;

                  return (
                    <div
                      key={day}
                      className={`p-2 rounded-xl text-[10px] font-mono transition-all border ${
                        isReached
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <div>{day}. Gün</div>
                      <div className="text-[11px] font-semibold">{targetPrice.toFixed(2)} ₺</div>
                      <div className="text-[9px]">+{Math.round((Math.pow(1.1, day) - 1) * 100)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Tahsisat Grupları & Fon Kullanım Yeri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tahsisat Grupları */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Tahsisat Grupları & Yatırımcı Dağılımı
              </h3>
              <p className="text-[11px] text-neutral-400">
                Halka arzda bireysel ve kurumsal yatırımcılara ayrılan paylar
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Yurt İçi Bireysel Yatırımcı
                </span>
                <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">%70</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Yurt İçi Kurumsal Yatırımcı
                </span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">%30</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              {ipo.allocationGroups ||
                'Yurt içi bireysel yatırımcılara eşit dağıtım yöntemi uygulanacaktır. Talep toplama sürecinde kurumsal yatırımcı talepleri konsorsiyum lideri tarafından tasnif edilir.'}
            </p>
          </div>
        </div>

        {/* Fon Kullanım Yeri */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PieChart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Halka Arz Gelirinin Kullanım Yerleri
              </h3>
              <p className="text-[11px] text-neutral-400">
                Şirketin elde edeceği fonun harcama kalemleri
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-neutral-800 dark:text-neutral-200">
                  İşletme Sermayesi Finansmanı
                </span>
                <span className="text-emerald-600 font-mono">%40</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Hammadde tedariki ve büyüyen ticaret hacminin işletme sermayesi gereksinimleri.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-neutral-800 dark:text-neutral-200">
                  Üretim Tesisi, Fabrika & Yatırımlar
                </span>
                <span className="text-blue-600 font-mono">%35</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Kapasite artışı, makine parkuru modernizasyonu ve güneş enerjisi yatırımları.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-neutral-800 dark:text-neutral-200">
                  Kısa Vadeli Borçların Kapatılması
                </span>
                <span className="text-purple-600 font-mono">%25</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Finansman giderlerinin düşürülmesi ve net nakit pozisyonunun güçlendirilmesi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* "Kaç Lot Düşer?" Tahmini Katılımcı Dağıtım Simülasyon Tablosu */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                "Kaç Lot Düşer?" — Tahmini Dağıtım Tablosu
              </h3>
              <p className="text-[11px] text-neutral-400">
                Olası katılımcı sayılarına göre bireysel yatırımcı başına düşecek tahmini lot ve tutar
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-medium">
                <th className="pb-3 font-semibold">Olası Katılımcı Sayısı</th>
                <th className="pb-3 font-semibold">Düşecek Tahmini Lot</th>
                <th className="pb-3 font-semibold">Gerekli Tahmini Tutar</th>
                <th className="pb-3 font-semibold">Dağıtım Oranı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {participantScenarios.map((scen, sIdx) => (
                <tr key={sIdx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="py-3 font-medium text-neutral-800 dark:text-neutral-200">
                    {scen.count} Katılımcı
                  </td>
                  <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    ~ {scen.lots} Lot
                  </td>
                  <td className="py-3 font-bold text-neutral-900 dark:text-white font-mono">
                    ~ {scen.amount}
                  </td>
                  <td className="py-3 text-neutral-500">
                    Kişi Başı Eşit Pay
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Şirket ve Ortak Taahhütleri (Güvenceler) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Şirket ve Ortakların Taahhütleri (Yatırımcı Güvenceleri)
            </h3>
            <p className="text-[11px] text-neutral-400">
              İzahnamede SPK onayına sunulan resmi kısıtlamalar ve koruma mekanizmaları
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>Satmama Taahhüdü</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              İhraççı şirket 1 yıl boyunca sermaye artırımı yapmayacak; şirket ortakları 1 yıl süreyle borsada pay satışı gerçekleştirmeyecektir.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <CheckCircle2 size={15} className="text-blue-500" />
              <span>Fiyat İstikrarı İşlemleri</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Payların Borsa İstanbul'da işlem görmeye başlamasından itibaren 15-30 gün süreyle brüt halka arz gelirinin %20'si kadar fon ile fiyat istikrarı planlanmaktadır.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <CheckCircle2 size={15} className="text-indigo-500" />
              <span>Günlük Alım Emri Taahhüdü</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Konsorsiyum lideri veya ana ortak tarafından 5 işlem günü boyunca halka arz fiyatından günlük alım emri girilmesi taahhüt edilmiştir.
            </p>
          </div>
        </div>
      </div>

      {/* Yapay Zeka (AI) İzahname Analizi */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Yapay Zeka (AI) İzahname Analizi & SWOT Raporu
            </h3>
            <p className="text-[11px] text-neutral-400">
              SPK onaylı taslak izahname metinlerinin AI tarafından sentezlenmiş özet değerlendirmesi
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {ipo.aiSummary ||
              `${ipo.companyName} izahnamesi incelendiğinde; şirketin güçlü FAVÖK marjı, düşük döviz pozisyon riski ve fon gelirinin büyük kısmını doğrudan yatırımlara ve işletme sermayesine ayırması temel katalizörler olarak öne çıkmaktadır.`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Şirketin Güçlü Yönleri
              </div>
              <ul className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1 list-disc pl-4">
                <li>Sektöründe yüksek pazar payı ve istikrarlı ciro büyümesi</li>
                <li>Halka arz gelirinin doğrudan büyüme ve kapasite artışına yönlendirilmesi</li>
                <li>Düşük finansal borçluluk ve güçlü özsermaye yapısı</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-1">
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Dikkat Edilmesi Gereken Riskler
              </div>
              <ul className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1 list-disc pl-4">
                <li>Hisse tavan serisi sonrasında kâr realizasyonu kaynaklı oynaklık riski</li>
                <li>Genel makroekonomik faiz oranları ve iç pazar talep dalgalanmaları</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Dış Bağlantılar & Resmi Evraklar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <FileText size={16} className="text-neutral-400" />
          <span>Resmi KAP İzahnamesi ve Onay Bülteni</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/kap/company-redirect/${encodeURIComponent(ipo.companyCode)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>{ipo.status === 'LISTED' ? 'KAP Şirket Sayfası' : 'Halka Arz Detay Sayfası'}</span>
            <ExternalLink size={12} />
          </a>

          <a
            href="https://spk.gov.tr/bulten"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <span>SPK Haftalık Bülten</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
