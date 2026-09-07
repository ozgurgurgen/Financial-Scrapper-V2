import React from 'react';
import { DepartmentType, EventStatus } from '../../services/AppEventBus';

export type CharacterRole = 'BORSA' | 'KAP' | 'MERKEZ_BANKASI' | 'ARSIV' | 'BACKFILL' | 'GATEKEEPER' | 'CAT' | 'KRIPTO' | 'HALKA_ARZ' | 'HABERLER' | 'AMERIKA' | 'ETF_FONLARI';

export interface PixelGameCharacterProps {
  role: CharacterRole;
  status: EventStatus;
  isWalking?: boolean;
  facing?: 'left' | 'right' | 'front';
  speechText?: string | null;
  roleBadge?: string;
  badgeColor?: string;
  onClick?: () => void;
  size?: number; // pixel height, default 64
  showDesk?: boolean;
  deskLabel?: string;
}

// Role based styles & palettes
const ROLE_CONFIGS: Record<CharacterRole, {
  name: string;
  badgeBg: string;
  hairColor: string;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  hairStyle: 'spiky' | 'bangs' | 'short' | 'bald_glasses' | 'robot' | 'cat' | 'wallstreet_slick' | 'etf_curls';
  deskProps: {
    screens: number;
    monitorColor: string;
    hasCoffee: boolean;
    hasPapers: boolean;
    hasMagnifier: boolean;
    hasRobotLight: boolean;
    hasDollarLogo?: boolean;
    hasGlobeHologram?: boolean;
  };
}> = {
  BORSA: {
    name: 'Borsa Analisti',
    badgeBg: '#3b82f6',
    hairColor: '#1e293b',
    skinColor: '#fcd34d',
    shirtColor: '#2563eb',
    pantsColor: '#1e3a8a',
    hairStyle: 'spiky',
    deskProps: { screens: 2, monitorColor: '#10b981', hasCoffee: true, hasPapers: true, hasMagnifier: false, hasRobotLight: false }
  },
  AMERIKA: {
    name: 'Wall Street Trader',
    badgeBg: '#0284c7',
    hairColor: '#451a03',
    skinColor: '#fed7aa',
    shirtColor: '#0f172a', // Navy Pinstripe Suit
    pantsColor: '#1e293b',
    hairStyle: 'wallstreet_slick',
    deskProps: { screens: 2, monitorColor: '#0284c7', hasCoffee: true, hasPapers: true, hasMagnifier: false, hasRobotLight: false, hasDollarLogo: true }
  },
  ETF_FONLARI: {
    name: 'Global ETF Yöneticisi',
    badgeBg: '#0d9488',
    hairColor: '#78350f',
    skinColor: '#fde047',
    shirtColor: '#047857', // Emerald Green Vest
    pantsColor: '#713f12',
    hairStyle: 'etf_curls',
    deskProps: { screens: 2, monitorColor: '#14b8a6', hasCoffee: true, hasPapers: true, hasMagnifier: false, hasRobotLight: false, hasGlobeHologram: true }
  },
  KAP: {
    name: 'KAP & AI Uzmanı',
    badgeBg: '#f59e0b',
    hairColor: '#451a03',
    skinColor: '#fde047',
    shirtColor: '#d97706',
    pantsColor: '#78350f',
    hairStyle: 'bangs',
    deskProps: { screens: 1, monitorColor: '#f59e0b', hasCoffee: true, hasPapers: true, hasMagnifier: true, hasRobotLight: false }
  },
  MERKEZ_BANKASI: {
    name: 'TCMB & Makro',
    badgeBg: '#10b981',
    hairColor: '#334155',
    skinColor: '#fed7aa',
    shirtColor: '#059669',
    pantsColor: '#064e3b',
    hairStyle: 'bald_glasses',
    deskProps: { screens: 1, monitorColor: '#059669', hasCoffee: true, hasPapers: true, hasMagnifier: false, hasRobotLight: false }
  },
  ARSIV: {
    name: 'DB & Arşiv',
    badgeBg: '#64748b',
    hairColor: '#0f172a',
    skinColor: '#fcd34d',
    shirtColor: '#475569',
    pantsColor: '#1e293b',
    hairStyle: 'short',
    deskProps: { screens: 2, monitorColor: '#06b6d4', hasCoffee: false, hasPapers: true, hasMagnifier: false, hasRobotLight: false }
  },
  BACKFILL: {
    name: '5Y Gece Botu',
    badgeBg: '#9333ea',
    hairColor: '#c084fc',
    skinColor: '#e9d5ff',
    shirtColor: '#7e22ce',
    pantsColor: '#581c87',
    hairStyle: 'robot',
    deskProps: { screens: 1, monitorColor: '#a855f7', hasCoffee: false, hasPapers: false, hasMagnifier: false, hasRobotLight: true }
  },
  GATEKEEPER: {
    name: 'Turnike Güvenlik',
    badgeBg: '#ef4444',
    hairColor: '#1e1b4b',
    skinColor: '#fde047',
    shirtColor: '#dc2626',
    pantsColor: '#991b1b',
    hairStyle: 'spiky',
    deskProps: { screens: 1, monitorColor: '#ef4444', hasCoffee: false, hasPapers: false, hasMagnifier: false, hasRobotLight: false }
  },
  CAT: {
    name: 'BISTi Kedi',
    badgeBg: '#f97316',
    hairColor: '#ea580c',
    skinColor: '#fdba74',
    shirtColor: '#ea580c',
    pantsColor: '#c2410c',
    hairStyle: 'cat',
    deskProps: { screens: 0, monitorColor: '', hasCoffee: false, hasPapers: false, hasMagnifier: false, hasRobotLight: false }
  },
  KRIPTO: {
    name: 'Kripto Madenci',
    badgeBg: '#f97316',
    hairColor: '#1e293b',
    skinColor: '#fcd34d',
    shirtColor: '#f97316',
    pantsColor: '#9a3412',
    hairStyle: 'short',
    deskProps: { screens: 2, monitorColor: '#f97316', hasCoffee: true, hasPapers: false, hasMagnifier: false, hasRobotLight: false }
  },
  HALKA_ARZ: {
    name: 'Halka Arz Analisti',
    badgeBg: '#ec4899',
    hairColor: '#1e293b',
    skinColor: '#fbcfe8',
    shirtColor: '#db2777',
    pantsColor: '#831843',
    hairStyle: 'short',
    deskProps: { screens: 1, monitorColor: '#ec4899', hasCoffee: true, hasPapers: true, hasMagnifier: false, hasRobotLight: false }
  },
  HABERLER: {
    name: 'Haber Editörü',
    badgeBg: '#06b6d4',
    hairColor: '#083344',
    skinColor: '#cffafe',
    shirtColor: '#0891b2',
    pantsColor: '#164e63',
    hairStyle: 'spiky',
    deskProps: { screens: 2, monitorColor: '#06b6d4', hasCoffee: true, hasPapers: true, hasMagnifier: false, hasRobotLight: false }
  }
};

export const PixelGameCharacter: React.FC<PixelGameCharacterProps> = React.memo(({
  role,
  status,
  isWalking = false,
  facing = 'front',
  speechText = null,
  roleBadge,
  badgeColor,
  onClick,
  size = 64,
  showDesk = false,
  deskLabel
}) => {
  const config = ROLE_CONFIGS[role] || ROLE_CONFIGS.BORSA;
  const isBusy = status === 'BUSY';
  const isSuccess = status === 'SUCCESS';
  const isError = status === 'ERROR';
  const isCooldown = status === 'COOLDOWN';

  // Cat special renderer
  if (role === 'CAT') {
    return (
      <div 
        onClick={onClick}
        className="relative group cursor-pointer select-none inline-flex flex-col items-center"
      >
        {speechText && (
          <div className="absolute -top-9 z-30 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 text-[11px] font-semibold px-2.5 py-1 rounded-xl shadow-md border border-neutral-300 dark:border-neutral-700 whitespace-nowrap animate-bounce">
            {speechText}
            <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-white dark:bg-neutral-900 border-r border-b border-neutral-300 dark:border-neutral-700 rotate-45" />
          </div>
        )}
        <div className="text-3xl filter drop-shadow-sm hover:scale-110 transition-transform">
          🐱
        </div>
        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-full border border-amber-300/50">
          BISTi Kedi (Zzz)
        </span>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`relative inline-flex flex-col items-center select-none group cursor-pointer transition-transform ${isBusy ? 'scale-105' : 'hover:scale-102'}`}
      style={{ minWidth: showDesk ? 90 : 54 }}
    >
      {/* 1. DYNAMIC COMIC SPEECH BUBBLE (Tıpkı referans görseldeki gibi beyaz kutu + kuyruk) */}
      {speechText && (
        <div className="absolute -top-12 z-30 max-w-[180px] bg-white text-neutral-900 text-[10px] font-bold px-2.5 py-1.5 rounded-2xl shadow-lg border border-neutral-200 whitespace-normal leading-tight text-center animate-fade-in pointer-events-none">
          <p className="line-clamp-2">{speechText}</p>
          {/* Speech Bubble Tail */}
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-neutral-200 rotate-45" />
        </div>
      )}

      {/* 2. ROLE BADGE PILL (Referans görseldeki turuncu/renkli hap etiket: "Architect", "Designer", vb.) */}
      <div 
        className="z-20 px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs tracking-wide mb-1 border border-white/20 whitespace-nowrap"
        style={{ backgroundColor: badgeColor || config.badgeBg }}
      >
        {roleBadge || config.name}
      </div>

      {/* 3. DESK + CHARACTER WORKSTATION CONTAINER */}
      <div className="relative flex items-center justify-center">
        
        {/* Desk Surface (If desk is enabled) */}
        {showDesk && (
          <div className="absolute -bottom-2 w-22 h-9 bg-amber-700/80 dark:bg-neutral-800 rounded-md border-2 border-amber-900/60 dark:border-neutral-700 shadow-md flex items-center justify-between px-1.5 z-0">
            {/* Monitor 1 */}
            <div className="w-6 h-5 bg-neutral-900 rounded-xs border border-neutral-600 flex items-center justify-center overflow-hidden">
              <div 
                className={`w-4 h-3 rounded-2xs ${isBusy ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: config.deskProps.monitorColor }}
              >
                <div className="w-full h-full flex flex-col justify-around p-0.5 opacity-80">
                  <div className="h-0.5 bg-white rounded-full w-3/4" />
                  <div className="h-0.5 bg-white rounded-full w-1/2" />
                </div>
              </div>
            </div>

            {/* Desk Props: Coffee / Sticky Notes */}
            <div className="flex items-center gap-1">
              {config.deskProps.hasCoffee && (
                <div className="w-2.5 h-3 bg-white rounded-xs border border-neutral-400 relative" title="Kahve">
                  <div className="absolute -right-1 top-0.5 w-1 h-1.5 border border-neutral-400 rounded-r-xs" />
                </div>
              )}
              {config.deskProps.hasPapers && (
                <div className="w-3 h-3.5 bg-yellow-100 border border-yellow-300 rotate-6 rounded-2xs" />
              )}
              {config.deskProps.hasMagnifier && (
                <div className="text-[10px]">🔍</div>
              )}
            </div>

            {/* Monitor 2 (Dual screen setup for Borsa/DB) */}
            {config.deskProps.screens > 1 && (
              <div className="w-6 h-5 bg-neutral-900 rounded-xs border border-neutral-600 flex items-center justify-center">
                <div className="w-4 h-3 bg-emerald-500/80 rounded-2xs flex items-center justify-center">
                  <span className="text-[6px] font-mono text-white font-bold">▲4.2</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PIXEL/VOXEL CHARACTER SVG FIGURINE */}
        <div 
          className={`relative z-10 ${
            isWalking ? 'anim-pixel-walk' :
            isBusy ? 'anim-pixel-typing' :
            isSuccess ? 'anim-pixel-cheer' :
            isError ? 'anim-pixel-error' :
            isCooldown ? 'anim-pixel-cooldown' : 'anim-pixel-idle'
          }`}
          style={{ width: size * 0.75, height: size }}
        >
          <svg
            viewBox="0 0 32 44"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* SHADOW */}
            <ellipse cx="16" cy="42" rx="10" ry="2.5" fill="rgba(0,0,0,0.25)" />

            {/* ROBOT SPECIAL CHARACTER */}
            {role === 'BACKFILL' ? (
              <g id="robot-body">
                {/* Robot Wheels / Base */}
                <rect x="8" y="36" width="16" height="5" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1" />
                <circle cx="11" cy="38.5" r="1.5" fill="#94a3b8" />
                <circle cx="21" cy="38.5" r="1.5" fill="#94a3b8" />

                {/* Robot Main Box Body */}
                <rect x="7" y="18" width="18" height="18" rx="3" fill={config.shirtColor} stroke="#0f172a" strokeWidth="1.2" />
                {/* Screen Chest Display */}
                <rect x="10" y="21" width="12" height="8" rx="1.5" fill="#1e1b4b" stroke="#c084fc" strokeWidth="0.8" />
                <circle cx="13" cy="25" r="1" fill="#38bdf8" className={isBusy ? 'animate-ping' : ''} />
                <circle cx="16" cy="25" r="1" fill="#4ade80" />
                <circle cx="19" cy="25" r="1" fill="#f43f5e" />

                {/* Robot Head */}
                <rect x="9" y="7" width="14" height="11" rx="2" fill={config.hairColor} stroke="#0f172a" strokeWidth="1.2" />
                {/* Eyes Visor */}
                <rect x="11" y="10" width="10" height="4" rx="1" fill="#38bdf8" />
                <rect x="13" y="11" width="2" height="2" fill="#ffffff" />
                <rect x="17" y="11" width="2" height="2" fill="#ffffff" />
                {/* Antenna */}
                <line x1="16" y1="7" x2="16" y2="2" stroke="#0f172a" strokeWidth="1.2" />
                <circle cx="16" cy="2" r="1.5" fill={isBusy ? '#f43f5e' : '#a855f7'} className={isBusy ? 'animate-ping' : ''} />

                {/* Robotic Arms */}
                <g className={isBusy ? 'anim-robot-arm-left' : ''}>
                  <rect x="3" y="20" width="4" height="10" rx="1.5" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
                  <circle cx="5" cy="31" r="1.5" fill="#cbd5e1" />
                </g>
                <g className={isBusy ? 'anim-robot-arm-right' : ''}>
                  <rect x="25" y="20" width="4" height="10" rx="1.5" fill="#64748b" stroke="#0f172a" strokeWidth="1" />
                  <circle cx="27" cy="31" r="1.5" fill="#cbd5e1" />
                </g>
              </g>
            ) : (
              /* HUMAN PIXEL/VOXEL CHARACTER */
              <g id="human-body">
                {/* LEGS & SHOES */}
                <g id="legs" className={isWalking ? 'anim-pixel-legs-walk' : ''}>
                  {/* Left Leg */}
                  <rect x="11" y="32" width="4" height="9" fill={config.pantsColor} stroke="#0f172a" strokeWidth="0.8" />
                  <rect x="10" y="39" width="5" height="3" rx="1" fill="#1e293b" />
                  
                  {/* Right Leg */}
                  <rect x="17" y="32" width="4" height="9" fill={config.pantsColor} stroke="#0f172a" strokeWidth="0.8" />
                  <rect x="17" y="39" width="5" height="3" rx="1" fill="#1e293b" />
                </g>

                {/* TORSO / SHIRT */}
                <g id="torso" className={isBusy ? 'anim-pixel-torso-busy' : ''}>
                  <rect x="9" y="19" width="14" height="14" rx="2" fill={config.shirtColor} stroke="#0f172a" strokeWidth="1" />
                  
                  {/* Shirt Collar / Tie / Details */}
                  {role === 'AMERIKA' ? (
                    <g>
                      {/* White Shirt Collar */}
                      <polygon points="12,19 16,23 20,19" fill="#ffffff" />
                      {/* Red Wall Street Power Tie */}
                      <path d="M 15 20 L 17 20 L 17.5 28 L 16 30 L 14.5 28 Z" fill="#dc2626" />
                      {/* Suspenders / Suit Lapel */}
                      <line x1="11" y1="19" x2="11" y2="33" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                      <line x1="21" y1="19" x2="21" y2="33" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
                    </g>
                  ) : role === 'ETF_FONLARI' ? (
                    <g>
                      {/* White Shirt Base under Vest */}
                      <polygon points="12,19 16,22 20,19" fill="#ffffff" />
                      {/* Gold / Brass Lapel Pin */}
                      <circle cx="12" cy="22" r="1" fill="#f59e0b" />
                      {/* Green Vest V-Neck Cut */}
                      <path d="M 10 19 L 16 26 L 22 19" stroke="#047857" strokeWidth="1.2" fill="none" />
                      {/* Brown Leather Belt */}
                      <line x1="9" y1="31" x2="23" y2="31" stroke="#78350f" strokeWidth="1.2" />
                      <rect x="15" y="30" width="2" height="2" fill="#f59e0b" />
                    </g>
                  ) : role === 'MERKEZ_BANKASI' ? (
                    <path d="M 15 20 L 17 20 L 17.5 27 L 16 29 L 14.5 27 Z" fill="#064e3b" />
                  ) : (
                    <path d="M 13 19 L 16 23 L 19 19" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
                  )}
                </g>

                {/* LEFT ARM */}
                <g id="pixelArmLeft" className={isBusy ? 'anim-pixel-arm-left-typing' : isSuccess ? 'anim-pixel-arm-left-cheer' : ''}>
                  <rect x="5" y="20" width="4" height="11" rx="1.5" fill={config.shirtColor} stroke="#0f172a" strokeWidth="0.8" />
                  <circle cx="7" cy="31" r="2" fill={config.skinColor} stroke="#0f172a" strokeWidth="0.8" />
                </g>

                {/* RIGHT ARM */}
                <g id="pixelArmRight" className={isBusy ? 'anim-pixel-arm-right-typing' : isSuccess ? 'anim-pixel-arm-right-cheer' : isCooldown ? 'anim-pixel-arm-right-coffee' : ''}>
                  <rect x="23" y="20" width="4" height="11" rx="1.5" fill={config.shirtColor} stroke="#0f172a" strokeWidth="0.8" />
                  <circle cx="25" cy="31" r="2" fill={config.skinColor} stroke="#0f172a" strokeWidth="0.8" />

                  {/* Coffee mug in hand during Cooldown */}
                  {isCooldown && (
                    <g transform="translate(24, 25)">
                      <rect x="0" y="0" width="5" height="6" rx="1" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
                      <path d="M 5 1.5 Q 7 3 5 4.5" stroke="#0f172a" strokeWidth="0.8" fill="none" />
                    </g>
                  )}
                </g>

                {/* HEAD & FACE */}
                <g id="head" className={isBusy ? 'anim-pixel-head-busy' : ''}>
                  {/* Skin Face Box */}
                  <rect x="10" y="8" width="12" height="12" rx="2" fill={config.skinColor} stroke="#0f172a" strokeWidth="1" />

                  {/* Hair Style */}
                  {config.hairStyle === 'spiky' && (
                    <g fill={config.hairColor}>
                      <rect x="9" y="6" width="14" height="5" rx="1" />
                      <polygon points="9,6 11,2 13,6" />
                      <polygon points="13,6 16,1 18,6" />
                      <polygon points="18,6 21,3 23,6" />
                    </g>
                  )}
                  {config.hairStyle === 'bangs' && (
                    <g fill={config.hairColor}>
                      <rect x="9" y="6" width="14" height="6" rx="1" />
                      <rect x="9" y="11" width="3" height="4" />
                      <rect x="20" y="11" width="3" height="4" />
                    </g>
                  )}
                  {config.hairStyle === 'bald_glasses' && (
                    <g>
                      <rect x="9" y="6" width="14" height="3" fill={config.hairColor} />
                      {/* Glasses */}
                      <rect x="11" y="11" width="4" height="3" rx="0.5" stroke="#0f172a" strokeWidth="0.8" fill="rgba(255,255,255,0.4)" />
                      <rect x="17" y="11" width="4" height="3" rx="0.5" stroke="#0f172a" strokeWidth="0.8" fill="rgba(255,255,255,0.4)" />
                      <line x1="15" y1="12" x2="17" y2="12" stroke="#0f172a" strokeWidth="0.8" />
                    </g>
                  )}
                  {config.hairStyle === 'wallstreet_slick' && (
                    <g fill={config.hairColor}>
                      {/* Slicked Back Wall Street Hair with High Fade */}
                      <rect x="9" y="5" width="14" height="5" rx="1.5" />
                      <path d="M 9 7 L 13 4 L 19 4 L 23 7 Z" />
                      {/* Golden Watch / Earring */}
                      <circle cx="9" cy="13" r="1" fill="#f59e0b" />
                    </g>
                  )}
                  {config.hairStyle === 'etf_curls' && (
                    <g>
                      <rect x="9" y="5" width="14" height="6" rx="2" fill={config.hairColor} />
                      <circle cx="10" cy="6" r="2" fill={config.hairColor} />
                      <circle cx="22" cy="6" r="2" fill={config.hairColor} />
                      {/* Tortoise-Shell Glasses */}
                      <rect x="11" y="11" width="4" height="3" rx="1" stroke="#78350f" strokeWidth="0.8" fill="rgba(255,255,255,0.5)" />
                      <rect x="17" y="11" width="4" height="3" rx="1" stroke="#78350f" strokeWidth="0.8" fill="rgba(255,255,255,0.5)" />
                      <line x1="15" y1="12" x2="17" y2="12" stroke="#78350f" strokeWidth="0.8" />
                    </g>
                  )}
                  {config.hairStyle === 'short' && (
                    <rect x="9" y="6" width="14" height="5" rx="1" fill={config.hairColor} />
                  )}

                  {/* Eyes (Pixel black dots) */}
                  {config.hairStyle !== 'bald_glasses' && (
                    <>
                      <rect x="12" y="12" width="2" height="2" fill="#0f172a" />
                      <rect x="18" y="12" width="2" height="2" fill="#0f172a" />
                      {/* Eye sparkle */}
                      <rect x="12" y="12" width="1" height="1" fill="#ffffff" />
                      <rect x="18" y="12" width="1" height="1" fill="#ffffff" />
                    </>
                  )}

                  {/* Mouth expressions */}
                  {isSuccess ? (
                    <path d="M 13 16 Q 16 19 19 16" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" fill="none" />
                  ) : isError ? (
                    <path d="M 13 17 Q 16 14 19 17" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" fill="none" />
                  ) : isBusy ? (
                    <rect x="15" y="16" width="2" height="1.5" fill="#0f172a" />
                  ) : (
                    <line x1="14" y1="16" x2="18" y2="16" stroke="#0f172a" strokeWidth="0.8" strokeLinecap="round" />
                  )}
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 4. STATUS INDICATOR DOT */}
      <div className="mt-1 flex items-center gap-1">
        <span 
          className={`w-2 h-2 rounded-full ${
            isBusy ? 'bg-cyan-500 animate-ping' :
            isSuccess ? 'bg-emerald-500' :
            isError ? 'bg-red-500' :
            isCooldown ? 'bg-amber-500' : 'bg-neutral-400'
          }`} 
        />
        <span className="text-[9px] font-mono text-neutral-600 dark:text-neutral-400">
          {status}
        </span>
      </div>
    </div>
  );
});
