import React, { useState, useEffect, useRef } from 'react';
import { DepartmentType, EventStatus } from '../../services/AppEventBus';
import { DEPARTMENTS } from '../../config/officeEventMap';
import { PixelGameCharacter, CharacterRole } from '../office/PixelGameCharacter';
import { PixarOfficeCharacter } from '../office/PixarOfficeCharacter';
import { PixarServerRack } from '../office/PixarServerRack';
import { IpoCalendarWidget } from '../office/IpoCalendarWidget';
import { gameAudio } from '../../utils/gameAudio';
import { 
  Check, 
  AlertTriangle, 
  Coffee, 
  Zap, 
  Database, 
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FastForward,
  RotateCcw,
  X,
  Layers,
  ArrowRight,
  TrendingUp,
  FileText,
  Landmark,
  Bot
} from 'lucide-react';

export interface OfficeCharacterState {
  currentStatus: EventStatus;
  lastEventTime: number;
  lastEventDetail: string;
  activeAnimation: string | null;
  processedCount: number;
  errorCount: number;
}

export interface FlyingPacket {
  id: string;
  fromDept: DepartmentType;
  toDept: DepartmentType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
}

export interface CourierWalker {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  role: CharacterRole;
  label: string;
}

interface OfficeStageViewProps {
  deptStates: Record<DepartmentType, OfficeCharacterState>;
  onTriggerAction: (dept: DepartmentType, label: string) => void;
  triggeringDept: DepartmentType | null;
  activePacketTrigger?: { from: DepartmentType; to: DepartmentType; id: string } | null;
  onOpenDbAnalytics?: () => void;
}

// Desk Layout Positions (in % of game canvas)
const DESK_POSITIONS: Record<DepartmentType, { x: number; y: number; room: string; badge: string }> = {
  MERKEZ_BANKASI: { x: 12, y: 38, room: 'Makro Masası', badge: 'TCMB & Makro' },
  BORSA: { x: 23, y: 38, room: 'Borsa Masası', badge: 'Borsa Analisti' },
  AMERIKA: { x: 34, y: 38, room: 'Wall Street Masası', badge: 'Wall Street Trader' },
  ETF_FONLARI: { x: 45, y: 38, room: 'Global ETF Masası', badge: 'Küresel Fon Yöneticisi' },
  KAP: { x: 56, y: 38, room: 'KAP & AI Masası', badge: 'KAP & AI Uzmanı' },
  KRIPTO: { x: 67, y: 38, room: 'Kripto Masası', badge: 'Kripto Madenci' },
  HALKA_ARZ: { x: 78, y: 38, room: 'Halka Arz (IPO)', badge: 'SPK & İzahname' },
  HABERLER: { x: 18, y: 65, room: 'Global Haberler', badge: 'AI Duyarlılık' },
  ARSIV: { x: 74, y: 76, room: 'Arşiv & Sunucu Kasası', badge: 'DB & Arşiv' },
  BACKFILL: { x: 88, y: 78, room: 'Robot İstasyonu', badge: '5Y Gece Botu' }
};

export const OfficeStageView: React.FC<OfficeStageViewProps> = React.memo(({
  deptStates,
  onTriggerAction,
  triggeringDept,
  activePacketTrigger,
  onOpenDbAnalytics
}) => {
  const [activePackets, setActivePackets] = useState<FlyingPacket[]>([]);
  const [activeCouriers, setActiveCouriers] = useState<CourierWalker[]>([]);
  const [archiveBumping, setArchiveBumping] = useState<boolean>(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRole | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [gameTime, setGameTime] = useState<string>('13:30');
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(true);
  const [catSpeech, setCatSpeech] = useState<string | null>('Zzz... 🐾');
  const [gateSpeech, setGateSpeech] = useState<string | null>('Girişler onaylandı ✓');
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  // Sound sync
  useEffect(() => {
    gameAudio.setMuted(isSoundMuted);
  }, [isSoundMuted]);

  // Game clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setGameTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Packet & Courier Spawning on Actions
  useEffect(() => {
    if (!activePacketTrigger) return;

    const fromPos = DESK_POSITIONS[activePacketTrigger.from] || { x: 50, y: 50 };
    const toPos = DESK_POSITIONS[activePacketTrigger.to] || { x: 74, y: 76 };
    const deptConfig = DEPARTMENTS[activePacketTrigger.from];

    // Play deliver sound
    gameAudio.playDeliver();

    // 1. Spawn Flying Data Packet
    const packetId = `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const packet: FlyingPacket = {
      id: packetId,
      fromDept: activePacketTrigger.from,
      toDept: activePacketTrigger.to,
      startX: fromPos.x,
      startY: fromPos.y,
      targetX: toPos.x,
      targetY: toPos.y,
      color: deptConfig?.dotColor || '#3b82f6'
    };

    setActivePackets((prev) => [...prev.slice(-3), packet]);

    // 2. Spawn Courier Walking from desk to Archive room
    const courierId = `cour_${Date.now()}`;
    const courier: CourierWalker = {
      id: courierId,
      fromX: fromPos.x,
      fromY: fromPos.y + 4,
      toX: toPos.x - 4,
      toY: toPos.y,
      role: activePacketTrigger.from as CharacterRole,
      label: 'Veri Paketi'
    };
    setActiveCouriers((prev) => [...prev.slice(-2), courier]);

    // Cleanup & trigger vault bump
    const timer = setTimeout(() => {
      setActivePackets((prev) => prev.filter((p) => p.id !== packetId));
      setActiveCouriers((prev) => prev.filter((c) => c.id !== courierId));
      if (activePacketTrigger.to === 'ARSIV') {
        setArchiveBumping(true);
        gameAudio.playSuccess();
        setTimeout(() => setArchiveBumping(false), 700);
      }
    }, 1300);

    return () => clearTimeout(timer);
  }, [activePacketTrigger]);

  // Handle Cat Click
  const handleCatClick = () => {
    gameAudio.playCatPurr();
    setCatSpeech('Miyav! Portföyün güvende 🐱');
    setTimeout(() => setCatSpeech('Zzz... 🐾'), 3500);
  };

  // Handle Gatekeeper Click
  const handleGateClick = () => {
    gameAudio.playClick();
    setGateSpeech('API Güvenlik Duvarı Aktif 🛡️');
    setTimeout(() => setGateSpeech('Girişler onaylandı ✓'), 3500);
  };

  // Generate dynamic speech for character based on state
  const getSpeechBubbleText = (role: CharacterRole): string | null => {
    if (role === 'CAT') return catSpeech;
    if (role === 'GATEKEEPER') return gateSpeech;

    const state = deptStates[role as DepartmentType];
    if (!state) return null;

    if (state.currentStatus === 'BUSY') {
      return state.lastEventDetail || 'Veri işleniyor...';
    }
    if (state.currentStatus === 'SUCCESS') {
      return 'Tamamlandı! ✓';
    }
    if (state.currentStatus === 'ERROR') {
      return 'Hata yakalandı! ⚠';
    }
    if (state.currentStatus === 'COOLDOWN') {
      return 'Kota beklemesi / Mola ☕';
    }

    // Idle random dialogue occasionally
    if (role === 'BORSA') return 'BIST 100 taranıyor...';
    if (role === 'KAP') return 'Yeni bildirim radarında 🔍';
    if (role === 'MERKEZ_BANKASI') return 'EVDS kurları hazır';
    if (role === 'ARSIV') return 'PostgreSQL hazır';
    if (role === 'BACKFILL') return '5Y bot devrede';

    return null;
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 text-neutral-100 select-none overflow-hidden font-sans">
      
      {/* ─── TOP GAME BAR / CONTROLS ─── */}
      <div className="h-11 bg-neutral-900 border-b border-neutral-800 px-4 flex items-center justify-between z-20 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-800/80 px-2.5 py-1 rounded-lg border border-neutral-700 font-mono text-xs text-amber-400 font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CANLI OFİS SİMÜLASYONU</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400">
            <span>İşlenen:</span>
            <span className="font-mono font-bold text-emerald-400">
              {(Object.values(deptStates) as OfficeCharacterState[]).reduce((acc, s) => acc + (s.processedCount || 0), 0)}
            </span>
          </div>
        </div>

        {/* Action Trigger Buttons & Sound */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              gameAudio.playClick();
              onTriggerAction('BORSA', 'Yahoo / BIST Taraması');
            }}
            disabled={triggeringDept !== null}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-600/90 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
          >
            <TrendingUp size={13} />
            <span className="hidden md:inline">Borsa Tetikle</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playClick();
              onTriggerAction('KAP', 'KAP Yapay Zeka Analizi');
            }}
            disabled={triggeringDept !== null}
            className="px-2.5 py-1 text-xs font-semibold bg-amber-600/90 hover:bg-amber-500 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
          >
            <Sparkles size={13} />
            <span className="hidden md:inline">KAP & AI</span>
          </button>

          <button
            onClick={() => {
              gameAudio.playClick();
              onTriggerAction('MERKEZ_BANKASI', 'TCMB EVDS Kurları');
            }}
            disabled={triggeringDept !== null}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
          >
            <Landmark size={13} />
            <span className="hidden md:inline">TCMB Kurları</span>
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-1" />

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const newMute = !isSoundMuted;
              setIsSoundMuted(newMute);
              if (!newMute) gameAudio.playClick();
            }}
            title={isSoundMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* ─── MAIN 2D TOP-DOWN GAME STAGE ─── */}
      <div 
        ref={stageContainerRef}
        className="flex-1 relative overflow-hidden game-floor-grid flex items-center justify-center p-2 sm:p-4 lg:p-6 min-h-[560px] sm:min-h-[660px] md:min-h-[760px] lg:min-h-[860px] 2xl:min-h-[960px] 3xl:min-h-[1100px]"
      >
        {/* Game Map Frame (Expansive 4K & Responsive Retro Floor Plan) */}
        <div className="relative w-full h-full min-h-[520px] sm:min-h-[620px] md:min-h-[720px] lg:min-h-[820px] 2xl:min-h-[920px] 3xl:min-h-[1050px] bg-[#d9c49e] dark:bg-[#1e1a14] rounded-2xl border-4 border-[#8c6b45] dark:border-[#382b1c] shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col transition-all">
          
          {/* ════════════ TOP ROOMS ROW (ENTRANCE & MEETING ROOM) ════════════ */}
          <div className="h-32 sm:h-38 md:h-44 lg:h-52 2xl:h-64 w-full flex border-b-4 border-[#8c6b45] dark:border-[#382b1c] bg-[#e7d8bb] dark:bg-[#252019] relative shrink-0">
            
            {/* Top Windows with sunlight rays */}
            <div className="absolute top-0 left-0 right-0 h-4 flex justify-around px-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
                <div key={w} className="w-12 md:w-16 2xl:w-20 h-3 md:h-4 bg-sky-300 dark:bg-sky-800/80 border border-sky-400 dark:border-sky-600 rounded-b-xs shadow-inner" />
              ))}
            </div>

            {/* 1. ENTRANCE GATE (Turnstile & Gatekeeper) */}
            <div className="w-1/2 h-full border-r-4 border-[#8c6b45] dark:border-[#382b1c] p-3 sm:p-5 flex items-center justify-between relative bg-gradient-to-b from-amber-50/40 to-transparent dark:from-amber-950/20">
              {/* Entrance Gatekeeper Character */}
              <div className="flex items-center gap-3 sm:gap-6 pl-2 sm:pl-4 pt-1">
                <PixarOfficeCharacter
                  role="GATEKEEPER"
                  status="IDLE"
                  speechText={gateSpeech}
                  onClick={handleGateClick}
                  size={95}
                  showDesk={false}
                />
                <div className="flex flex-col gap-2">
                  {/* Modern Glass Security Turnstile */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono text-cyan-300 font-bold tracking-widest shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>SECURITY: OK</span>
                  </div>
                  {/* Card Scanner */}
                  <div className="flex items-center gap-2 bg-neutral-800/80 p-1.5 rounded-md border border-neutral-700">
                    <div className="w-3 h-4 bg-amber-400/90 rounded-xs shadow-xs" />
                    <span className="text-[9px] font-mono text-neutral-300">RFID SCAN</span>
                  </div>
                </div>
              </div>

              {/* Welcome Mat & Potted Plant */}
              <div className="flex flex-col items-center gap-2 pr-4 sm:pr-8 pt-2">
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-[10px] sm:text-xs font-black text-amber-50 px-4 py-1.5 rounded-lg border border-amber-400/40 shadow-md tracking-wider">
                  BIST OFİSİ
                </div>
                {/* Plant */}
                <div className="text-3xl sm:text-4xl filter drop-shadow-md" title="Ofis Bitkisi">🪴</div>
              </div>

              {/* Bulletin Board */}
              <div className="absolute right-3 top-3 w-18 sm:w-22 h-12 sm:h-16 bg-amber-900/90 rounded-lg border-2 border-amber-950 p-1.5 flex flex-wrap gap-1 shadow-md">
                <div className="w-3 h-3 bg-yellow-200 rounded-2xs shadow-2xs rotate-3" />
                <div className="w-3 h-3 bg-pink-300 rounded-2xs shadow-2xs -rotate-6" />
                <div className="w-3 h-3 bg-cyan-200 rounded-2xs shadow-2xs rotate-12" />
                <div className="w-3 h-3 bg-emerald-200 rounded-2xs shadow-2xs -rotate-3" />
              </div>
            </div>

            {/* 2. MEETING ROOM (Top Right) */}
            <div className="w-1/2 h-full bg-gradient-to-br from-indigo-950/20 to-blue-900/10 dark:bg-[#1b2433]/50 p-3 sm:p-5 flex items-center justify-center relative">
              <span className="absolute top-2 left-3 sm:left-5 text-[9px] sm:text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                STRATEJİ & PORTFÖY TOPLANTISI
              </span>

              {/* Big Glass & Wood Meeting Table */}
              <div className="relative w-52 sm:w-72 md:w-88 2xl:w-104 h-20 sm:h-24 md:h-28 2xl:h-36 bg-gradient-to-r from-[#b8864e] via-[#cfa068] to-[#b8864e] dark:from-[#4a351e] dark:to-[#382b1c] rounded-2xl border-2 border-[#785226] shadow-xl flex items-center justify-around px-4">
                {/* Modern Chairs top */}
                <div className="absolute -top-4 sm:-top-5 left-6 sm:left-8 w-8 sm:w-10 h-4 sm:h-5 bg-slate-800 rounded-t-lg border-t border-slate-600 shadow-sm" />
                <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-4 sm:h-5 bg-slate-800 rounded-t-lg border-t border-slate-600 shadow-sm" />
                <div className="absolute -top-4 sm:-top-5 right-6 sm:right-8 w-8 sm:w-10 h-4 sm:h-5 bg-slate-800 rounded-t-lg border-t border-slate-600 shadow-sm" />
                
                {/* Holographic Projection on Table */}
                <div className="flex items-center gap-3 bg-indigo-950/70 border border-indigo-500/50 px-3 py-1.5 rounded-lg shadow-inner">
                  <span className="text-[11px] sm:text-xs 2xl:text-sm font-bold text-cyan-300 font-mono tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    BIST PORTFÖY PROJEKSİYONU
                  </span>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold">▲ +14.2% HEDEF</div>
                </div>

                {/* Modern Chairs bottom */}
                <div className="absolute -bottom-4 sm:-bottom-5 left-6 sm:left-8 w-8 sm:w-10 h-4 sm:h-5 bg-slate-800 rounded-b-lg border-b border-slate-600 shadow-sm" />
                <div className="absolute -bottom-4 sm:-bottom-5 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-4 sm:h-5 bg-slate-800 rounded-b-lg border-b border-slate-600 shadow-sm" />
                <div className="absolute -bottom-4 sm:-bottom-5 right-6 sm:right-8 w-8 sm:w-10 h-4 sm:h-5 bg-slate-800 rounded-b-lg border-b border-slate-600 shadow-sm" />
              </div>

              {/* Plant */}
              <div className="absolute right-4 bottom-2 text-3xl sm:text-4xl filter drop-shadow-md">🌿</div>
            </div>
          </div>

          {/* ════════════ MIDDLE OPEN WORKSPACE (MAIN DESKS) ════════════ */}
          <div className="flex-1 relative flex flex-col items-center justify-center px-4 sm:px-12 md:px-16 2xl:px-24 py-8 sm:py-12 md:py-16 2xl:py-24 min-h-[260px] sm:min-h-[340px] 2xl:min-h-[440px]">
            
            {/* Wall Posters / Kanban Boards */}
            <div className="absolute top-2 sm:top-4 left-6 sm:left-12 bg-white/90 dark:bg-neutral-800 p-2 rounded-sm border border-neutral-300 dark:border-neutral-700 shadow-xs flex flex-col gap-1">
              <span className="text-[8px] sm:text-[9px] font-bold text-neutral-500 font-mono">SPRINT BOARD</span>
              <div className="flex gap-1.5">
                <div className="w-3.5 h-2.5 bg-yellow-300 rounded-2xs" />
                <div className="w-3.5 h-2.5 bg-cyan-300 rounded-2xs" />
                <div className="w-3.5 h-2.5 bg-emerald-300 rounded-2xs" />
              </div>
            </div>

            <div className="absolute top-2 sm:top-4 right-6 sm:right-12 bg-white/90 dark:bg-neutral-800 p-2 rounded-sm border border-neutral-300 dark:border-neutral-700 shadow-xs flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">FINANCE PIPELINE</span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {/* DESKS CONTAINER: Grid layout for trading floor */}
            <div className="w-full flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 items-center z-20 pt-8 sm:pt-4">

              {/* DESK 1: MERKEZ BANKASI (Makro) */}
              <div className="relative flex flex-col items-center">
                <PixarOfficeCharacter
                  role="MERKEZ_BANKASI"
                  status={deptStates.MERKEZ_BANKASI?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('MERKEZ_BANKASI')}
                  onClick={() => setSelectedCharacter('MERKEZ_BANKASI')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 2: BORSA ANALİSTİ (BIST 100) */}
              <div className="relative flex flex-col items-center z-10">
                <PixarOfficeCharacter
                  role="BORSA"
                  status={deptStates.BORSA?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('BORSA')}
                  onClick={() => setSelectedCharacter('BORSA')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 3: WALL STREET & ABD PİYASALARI (Top 1.000 Şirket) */}
              <div className="relative flex flex-col items-center z-10">
                <PixarOfficeCharacter
                  role="AMERIKA"
                  status={deptStates.AMERIKA?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('AMERIKA')}
                  onClick={() => setSelectedCharacter('AMERIKA')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 4: KÜRESEL ETF & PORTFÖY YÖNETİCİSİ */}
              <div className="relative flex flex-col items-center z-10">
                <PixarOfficeCharacter
                  role="ETF_FONLARI"
                  status={deptStates.ETF_FONLARI?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('ETF_FONLARI')}
                  onClick={() => setSelectedCharacter('ETF_FONLARI')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 5: KAP & YZ ANALİSTİ */}
              <div className="relative flex flex-col items-center">
                <PixarOfficeCharacter
                  role="KAP"
                  status={deptStates.KAP?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('KAP')}
                  onClick={() => setSelectedCharacter('KAP')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 6: KRIPTO MINER & TICKER */}
              <div className="relative flex flex-col items-center">
                <PixarOfficeCharacter
                  role="KRIPTO"
                  status={deptStates.KRIPTO?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('KRIPTO')}
                  onClick={() => setSelectedCharacter('KRIPTO')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 7: HALKA ARZ (IPO) UZMANI */}
              <div className="relative flex flex-col items-center z-10">
                <PixarOfficeCharacter
                  role="HALKA_ARZ"
                  status={deptStates.HALKA_ARZ?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('HALKA_ARZ')}
                  onClick={() => setSelectedCharacter('HALKA_ARZ')}
                  showDesk={true}
                  size={90}
                />
              </div>

              {/* DESK 8: HABER MERKEZİ ANALİSTİ */}
              <div className="relative flex flex-col items-center">
                <PixarOfficeCharacter
                  role="HABERLER"
                  status={deptStates.HABERLER?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('HABERLER')}
                  onClick={() => setSelectedCharacter('HABERLER')}
                  showDesk={true}
                  size={90}
                />
              </div>

            </div>

            {/* Plant in middle */}
            <div className="absolute bottom-2 left-8 text-3xl sm:text-4xl filter drop-shadow-md">🪴</div>
            <div className="absolute bottom-2 right-8 text-3xl sm:text-4xl filter drop-shadow-md">🌵</div>
          </div>

          {/* ════════════ BOTTOM ROOMS ROW (LOUNGE & ARCHIVE / SERVER VAULT) ════════════ */}
          <div className="h-44 sm:h-52 md:h-64 lg:h-72 2xl:h-84 w-full flex border-t-4 border-[#8c6b45] dark:border-[#382b1c] bg-[#e7d8bb] dark:bg-[#252019] shrink-0">
            
            {/* 1. LOUNGE & CAFE ROOM (Bottom Left) */}
            <div className="w-1/2 h-full bg-gradient-to-tr from-emerald-950/20 via-teal-900/10 to-transparent dark:bg-[#1f332d]/40 border-r-4 border-[#8c6b45] dark:border-[#382b1c] p-3 sm:p-5 flex items-center justify-between relative">
              <span className="absolute top-2 left-3 sm:left-5 text-[9px] sm:text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LOUNGE & CAFE
              </span>

              {/* Cafe Machine & Water Cooler */}
              <div className="flex flex-col gap-2.5 pl-2 sm:pl-4">
                {/* Espresso Machine */}
                <div className="w-11 sm:w-14 h-14 sm:h-16 bg-neutral-900 rounded-xl border border-neutral-700 flex flex-col items-center justify-between p-2 shadow-lg">
                  <span className="text-[8px] font-bold text-amber-400 font-mono tracking-wider">ESPRESSO</span>
                  <div className="w-6 sm:w-7 h-3 bg-amber-800 rounded-md" />
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
                {/* Water Dispenser */}
                <div className="w-9 sm:w-11 h-11 sm:h-13 bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-400 flex flex-col items-center justify-between p-1 shadow-md">
                  <div className="w-6 sm:w-7 h-6 sm:h-7 bg-sky-400/80 rounded-full shadow-inner" />
                  <div className="w-4 h-1.5 bg-red-500 rounded-full" />
                </div>
              </div>

              {/* Brown Leather Sofa & Coffee Table */}
              <div className="flex items-center gap-3 sm:gap-5">
                {/* Sofa */}
                <div className="w-28 sm:w-36 md:w-44 2xl:w-56 h-18 sm:h-22 md:h-26 2xl:h-30 bg-gradient-to-b from-[#8d5b4c] to-[#6a3f33] rounded-2xl border-2 border-[#5c3a30] shadow-xl flex items-center justify-center p-2">
                  <div className="w-full h-full bg-[#a06856] dark:bg-[#59372d] rounded-xl border border-[#5c3a30]/50 shadow-inner flex items-center justify-around">
                    <div className="w-6 h-10 bg-[#8d5b4c] rounded-md" />
                    <div className="w-6 h-10 bg-[#8d5b4c] rounded-md" />
                    <div className="w-6 h-10 bg-[#8d5b4c] rounded-md" />
                  </div>
                </div>
                {/* Round Coffee Table */}
                <div className="w-14 sm:w-18 md:w-22 2xl:w-26 h-14 sm:h-18 md:h-22 2xl:h-26 rounded-full bg-gradient-to-tr from-[#c99765] to-[#f4d2a8] dark:from-[#523d29] dark:to-[#382819] border-2 border-[#805834] shadow-lg flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-full border border-neutral-300 shadow-sm flex items-center justify-center">
                    <div className="w-3 h-3 bg-amber-900 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Sleeping Cat "BISTy" 🐱 */}
              <div className="pr-4 sm:pr-8">
                <PixarOfficeCharacter
                  role="CAT"
                  status="IDLE"
                  speechText={catSpeech}
                  onClick={handleCatClick}
                  size={100}
                  showDesk={false}
                />
              </div>
            </div>

            {/* 2. RESEARCH, ARCHIVE & POSTGRESQL SERVER VAULT (Bottom Right) */}
            <div className="w-1/2 h-full bg-gradient-to-tl from-purple-950/25 via-indigo-950/15 to-transparent dark:bg-[#201933]/50 p-3 sm:p-5 flex items-center justify-around relative">
              <span className="absolute top-2 left-3 sm:left-5 text-[9px] sm:text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                ARŞİV & POSTGRESQL SUNUCU KASASI
              </span>

              {/* 3D Pixar PostgreSQL Server Rack Tower (Left Side) */}
              <div className="relative flex items-center justify-center">
                <PixarServerRack
                  label="POSTGRESQL CLUSTER"
                  isProcessing={deptStates.ARSIV?.currentStatus === 'BUSY' || archiveBumping}
                  recordCount={deptStates.ARSIV?.processedCount || 148200}
                  size={95}
                  onClick={() => {
                    if (onOpenDbAnalytics) {
                      onOpenDbAnalytics();
                    } else {
                      setSelectedCharacter('ARSIV');
                    }
                  }}
                />
              </div>

              {/* DB Admin Character */}
              <div className="relative">
                <PixarOfficeCharacter
                  role="ARSIV"
                  status={deptStates.ARSIV?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('ARSIV')}
                  onClick={() => setSelectedCharacter('ARSIV')}
                  showDesk={true}
                  size={110}
                />
              </div>

              {/* 5Y Night Backfill Robot */}
              <div className="relative">
                <PixarOfficeCharacter
                  role="BACKFILL"
                  status={deptStates.BACKFILL?.currentStatus || 'IDLE'}
                  speechText={getSpeechBubbleText('BACKFILL')}
                  onClick={() => setSelectedCharacter('BACKFILL')}
                  size={100}
                  showDesk={false}
                />
              </div>
            </div>
          </div>

          {/* ════════════ DYNAMIC COURIERS & FLYING PACKETS ════════════ */}
          {/* 1. Flying Data Packets */}
          {activePackets.map((pkt) => (
            <div
              key={pkt.id}
              className="absolute pointer-events-none z-40 flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-lg border border-white/40 anim-data-packet"
              style={{
                left: `${pkt.startX}%`,
                top: `${pkt.startY}%`,
                backgroundColor: pkt.color,
                '--dx': `${pkt.targetX - pkt.startX}%`,
                '--dy': `${pkt.targetY - pkt.startY}%`,
              } as React.CSSProperties}
            >
              <Zap size={10} className="animate-spin" />
              <span className="font-mono text-[8px]">DATA</span>
            </div>
          ))}

          {/* 2. Walking Couriers */}
          {activeCouriers.map((c) => (
            <div
              key={c.id}
              className="absolute pointer-events-none z-30 flex flex-col items-center"
              style={{
                left: `${c.fromX}%`,
                top: `${c.fromY}%`,
                animation: 'courier-walk-path 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                '--dx': `${c.toX - c.fromX}%`,
                '--dy': `${c.toY - c.fromY}%`,
              } as React.CSSProperties}
            >
              <div className="bg-amber-400 text-neutral-950 font-bold text-[8px] px-1.5 py-0.2 rounded-full shadow-xs border border-amber-500 whitespace-nowrap">
                📦 {c.label}
              </div>
              <div className="text-xl animate-bounce">🏃</div>
            </div>
          ))}

        </div>
      </div>

      {/* ─── RETRO BOTTOM STATUS BAR (Exact visual match with user's reference) ─── */}
      <div className="h-10 bg-neutral-900 border-t border-neutral-800 px-4 flex items-center justify-between text-xs z-20 shrink-0 font-mono">
        
        {/* Left: Game Clock */}
        <div className="flex items-center gap-3 text-neutral-300 font-bold">
          <span className="text-amber-400">{gameTime}</span>
          <div className="h-3 w-px bg-neutral-700" />
          
          {/* Character Status Roster */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-normal text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Gatekeeper · Aktif
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${deptStates.BORSA?.currentStatus === 'BUSY' ? 'bg-cyan-400 animate-ping' : 'bg-blue-500'}`} /> Borsa · {deptStates.BORSA?.currentStatus || 'Boşta'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${deptStates.KAP?.currentStatus === 'BUSY' ? 'bg-amber-400 animate-ping' : 'bg-amber-500'}`} /> KAP · {deptStates.KAP?.currentStatus || 'Boşta'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${deptStates.KRIPTO?.currentStatus === 'BUSY' ? 'bg-orange-400 animate-ping' : 'bg-orange-500'}`} /> Kripto · {deptStates.KRIPTO?.currentStatus || 'Boşta'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> TCMB · {deptStates.MERKEZ_BANKASI?.currentStatus || 'Boşta'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Arşiv · {deptStates.ARSIV?.currentStatus || 'Boşta'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" /> Kedi · Zzz
            </span>
          </div>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-2 text-neutral-400">
          <button 
            onClick={() => setIsSimulationRunning(!isSimulationRunning)}
            className="p-1 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title={isSimulationRunning ? 'Simülasyonu Duraklat' : 'Simülasyonu Başlat'}
          >
            {isSimulationRunning ? <Pause size={14} /> : <Play size={14} className="text-emerald-400" />}
          </button>
          
          <button 
            onClick={() => {
              gameAudio.playClick();
              onTriggerAction('BORSA', 'Hızlı Senkronizasyon');
            }}
            className="p-1 rounded hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Hızlı İlerle"
          >
            <FastForward size={14} />
          </button>
        </div>
      </div>

      {/* ─── CHARACTER INSPECTOR MODAL ─── */}
      {selectedCharacter && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedCharacter(null)}
              className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neutral-800 rounded-xl border border-neutral-700 flex items-center justify-center">
                <PixarOfficeCharacter
                  role={selectedCharacter}
                  status={
                    selectedCharacter === 'GATEKEEPER' || selectedCharacter === 'CAT' 
                      ? 'IDLE' 
                      : (deptStates[selectedCharacter as DepartmentType]?.currentStatus || 'IDLE')
                  }
                  size={64}
                  showDesk={false}
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedCharacter === 'BORSA' && 'Borsa & Hisse Masası (BIST)'}
                  {selectedCharacter === 'AMERIKA' && 'Wall Street & ABD Piyasası (Top 1.000 Şirket)'}
                  {selectedCharacter === 'ETF_FONLARI' && 'Global ETF & Fon Masası'}
                  {selectedCharacter === 'KAP' && 'KAP & Yapay Zeka (AI) Masası'}
                  {selectedCharacter === 'KRIPTO' && 'Kripto & On-Chain Masası'}
                  {selectedCharacter === 'MERKEZ_BANKASI' && 'TCMB & Makro Masası'}
                  {selectedCharacter === 'ARSIV' && 'PostgreSQL Veritabanı & Arşiv'}
                  {selectedCharacter === 'BACKFILL' && '5 Yıllık Gece Robotu'}
                  {selectedCharacter === 'GATEKEEPER' && 'Güvenlik & Giriş Turnikesi'}
                  {selectedCharacter === 'CAT' && 'Ofis Maskotu "BISTi"'}
                  {selectedCharacter === 'HALKA_ARZ' && 'Halka Arz & İzahname (IPO) Masası'}
                  {selectedCharacter === 'HABERLER' && 'Global Haberler & AI Duyarlılık Editörü'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {selectedCharacter === 'BORSA' && 'Yahoo Finance & BIST100 anlık veri çekme ve RSI hesaplama.'}
                  {selectedCharacter === 'AMERIKA' && 'NYSE & NASDAQ en büyük 1.000 şirketin anlık fiyat, F/K, PEG, Temettü ve 5 yıllık OHLCV geçmişi.'}
                  {selectedCharacter === 'ETF_FONLARI' && 'SPY, QQQ, VOO, SCHD, TLT, GLD, IBIT vb. borsa yatırım fonlarının AUM, masraf oranı ve varlık dağılımı.'}
                  {selectedCharacter === 'KAP' && 'KAP bildirimlerini tarayıp ayarlarınızda seçili Yapay Zeka modeliyle özetler.'}
                  {selectedCharacter === 'KRIPTO' && 'Kripto paralar için cüzdan ve fiyat verilerini izler.'}
                  {selectedCharacter === 'MERKEZ_BANKASI' && 'TCMB EVDS döviz kurları ve makro göstergeler.'}
                  {selectedCharacter === 'ARSIV' && 'Tüm verilerin saklandığı kalıcı PostgreSQL deposu.'}
                  {selectedCharacter === 'BACKFILL' && 'Geçmiş 5 yıllık mum verilerini arka planda tarar.'}
                  {selectedCharacter === 'GATEKEEPER' && 'Gelen veri akışını ve bağlantıları denetler.'}
                  {selectedCharacter === 'CAT' && 'Masalar arası gezer, portföy stresini azaltır.'}
                  {selectedCharacter === 'HALKA_ARZ' && 'SPK Bülteni ve KAP izahnamelerini tarayıp yeni IPO\'ları tespit eder.'}
                  {selectedCharacter === 'HABERLER' && 'Global ve yerel ekonomi haberlerini yapay zekaya (Sentiment) analiz ettirir.'}
                </p>
              </div>
            </div>

            {/* Department stats */}
            {selectedCharacter !== 'GATEKEEPER' && selectedCharacter !== 'CAT' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-neutral-800/80 p-2.5 rounded-lg border border-neutral-700">
                  <span className="text-[10px] text-neutral-400 block font-mono">İŞLENEN VERİ</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {deptStates[selectedCharacter as DepartmentType]?.processedCount || 0} paket
                  </span>
                </div>
                <div className="bg-neutral-800/80 p-2.5 rounded-lg border border-neutral-700">
                  <span className="text-[10px] text-neutral-400 block font-mono">HATA SAYISI</span>
                  <span className="text-sm font-bold text-red-400 font-mono">
                    {deptStates[selectedCharacter as DepartmentType]?.errorCount || 0} adet
                  </span>
                </div>
              </div>
            )}

            {/* Special Database Analytics Action for ARSIV */}
            {selectedCharacter === 'ARSIV' && onOpenDbAnalytics && (
              <button
                onClick={() => {
                  gameAudio.playClick();
                  setSelectedCharacter(null);
                  onOpenDbAnalytics();
                }}
                className="w-full mb-2.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg text-xs cursor-pointer"
              >
                <Database size={15} />
                <span>📊 Veritabanı Kullanım &amp; Hareket Grafiklerini Aç</span>
              </button>
            )}

            {/* Special IPO Calendar Action for HALKA_ARZ */}
            {selectedCharacter === 'HALKA_ARZ' && (
              <IpoCalendarWidget />
            )}

            {/* Action Trigger Button */}
            {selectedCharacter !== 'GATEKEEPER' && selectedCharacter !== 'CAT' && (
              <button
                onClick={() => {
                  gameAudio.playClick();
                  onTriggerAction(selectedCharacter as DepartmentType, 'Manuel Görev');
                  setSelectedCharacter(null);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md text-xs cursor-pointer"
              >
                <Play size={14} />
                <span>Bu Masanın Görevini Çalıştır</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
});
