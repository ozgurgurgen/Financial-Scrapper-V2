import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EventStatus } from '../../services/AppEventBus';
import { CharacterRole } from './PixelGameCharacter';
import { Activity, Sparkles, AlertCircle, Coffee, Shield, Zap } from 'lucide-react';

export interface PixarOfficeCharacterProps {
  role: CharacterRole;
  status: EventStatus;
  speechText?: string | null;
  roleBadge?: string;
  badgeColor?: string;
  onClick?: () => void;
  size?: number;
  showDesk?: boolean;
  deskLabel?: string;
}

export const PixarOfficeCharacter: React.FC<PixarOfficeCharacterProps> = React.memo(({
  role = 'BORSA',
  status = 'IDLE',
  speechText = null,
  roleBadge,
  badgeColor,
  onClick,
  size = 120,
  showDesk = true,
  deskLabel
}) => {
  const isBusy = status === 'BUSY';
  const isSuccess = status === 'SUCCESS';
  const isError = status === 'ERROR';
  const isCooldown = status === 'COOLDOWN';
  const isIdle = status === 'IDLE';

  // Role metadata presets
  const roleConfig = React.useMemo(() => {
    switch (role) {
      case 'MERKEZ_BANKASI':
        return {
          title: roleBadge || 'TCMB & Makro',
          color: badgeColor || 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          accent: '#ef4444',
          glow: 'bg-rose-500/25',
          label: deskLabel || 'TCMB EVDS MASASI'
        };
      case 'KAP':
        return {
          title: roleBadge || 'KAP & AI Uzmanı',
          color: badgeColor || 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          accent: '#10b981',
          glow: 'bg-emerald-500/25',
          label: deskLabel || 'KAP BİLDİRİM MASASI'
        };
      case 'ARSIV':
        return {
          title: roleBadge || 'DB & Arşiv',
          color: badgeColor || 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
          accent: '#8b5cf6',
          glow: 'bg-purple-500/25',
          label: deskLabel || 'POSTGRESQL KASASI'
        };
      case 'BACKFILL':
        return {
          title: roleBadge || '5Y Gece Botu',
          color: badgeColor || 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          accent: '#f59e0b',
          glow: 'bg-amber-500/25',
          label: deskLabel || 'VERİ BOTU'
        };
      case 'GATEKEEPER':
        return {
          title: roleBadge || 'Güvenlik Görevlisi',
          color: badgeColor || 'linear-gradient(135deg, #475569 0%, #334155 100%)',
          accent: '#64748b',
          glow: 'bg-slate-500/25',
          label: deskLabel || 'GÜVENLİK KAPISI'
        };
      case 'CAT':
        return {
          title: roleBadge || 'BISTy (Maskot)',
          color: badgeColor || 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
          accent: '#f97316',
          glow: 'bg-orange-500/25',
          label: deskLabel || 'DİNLENME ALANI'
        };
      case 'KRIPTO':
        return {
          title: roleBadge || 'Kripto Madenci',
          color: badgeColor || 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
          accent: '#f59e0b',
          glow: 'bg-orange-500/25',
          label: deskLabel || 'GPU MINER RIG'
        };
      case 'HALKA_ARZ':
        return {
          title: roleBadge || 'SPK & İzahname',
          color: badgeColor || 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
          accent: '#ec4899',
          glow: 'bg-pink-500/25',
          label: deskLabel || 'HALKA ARZ MASASI'
        };
      case 'HABERLER':
        return {
          title: roleBadge || 'AI Duyarlılık',
          color: badgeColor || 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
          accent: '#06b6d4',
          glow: 'bg-cyan-500/25',
          label: deskLabel || 'HABER MERKEZİ'
        };
      case 'AMERIKA':
        return {
          title: roleBadge || 'Wall Street Trader',
          color: badgeColor || 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          accent: '#38bdf8',
          glow: 'bg-sky-500/25',
          label: deskLabel || 'WALL STREET MASASI'
        };
      case 'ETF_FONLARI':
        return {
          title: roleBadge || 'Global ETF Masası',
          color: badgeColor || 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          accent: '#2dd4bf',
          glow: 'bg-teal-500/25',
          label: deskLabel || 'KÜRESEL ETF MASASI'
        };
      case 'BORSA':
      default:
        return {
          title: roleBadge || 'Borsa Analisti',
          color: badgeColor || 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          accent: '#3b82f6',
          glow: 'bg-cyan-500/25',
          label: deskLabel || 'BIST 100 MASASI'
        };
    }
  }, [role, roleBadge, badgeColor, deskLabel]);

  return (
    <div
      onClick={onClick}
      className="relative inline-flex flex-col items-center select-none group cursor-pointer transition-transform duration-300"
      style={{ minWidth: showDesk ? size * 1.5 : size * 0.9 }}
    >
      {/* ─── 1. PIXAR-STYLE SOFT POP-IN SPEECH BUBBLE ─── */}
      <AnimatePresence>
        {speechText && (
          <motion.div
            key={speechText}
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="absolute -top-16 z-40 max-w-[220px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md text-neutral-900 dark:text-neutral-100 text-xs font-semibold px-3.5 py-2 rounded-2xl shadow-xl border border-neutral-200/80 dark:border-neutral-700/80 text-center pointer-events-none"
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              {isBusy && <Activity size={12} className="text-cyan-500 animate-pulse shrink-0" />}
              {isSuccess && <Sparkles size={12} className="text-emerald-500 shrink-0" />}
              {isError && <AlertCircle size={12} className="text-rose-500 shrink-0" />}
              {isCooldown && <Coffee size={12} className="text-amber-500 shrink-0" />}
              {isIdle && <Zap size={12} className="text-blue-500 shrink-0" />}
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold" style={{ color: roleConfig.accent }}>
                {isBusy ? 'İşleniyor' : isSuccess ? 'Tamamlandı' : isError ? 'Uyarı' : 'Aktif'}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-snug font-medium text-neutral-700 dark:text-neutral-200">
              {speechText}
            </p>

            {/* Bubble Triangle Tail */}
            <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-neutral-900/95 border-r border-b border-neutral-200/80 dark:border-neutral-700/80 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 2. CUTE 3D PILL BADGE ─── */}
      <motion.div
        animate={isBusy ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className="z-30 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-md tracking-wide mb-1 flex items-center gap-1.5 border border-white/30 backdrop-blur-xs"
        style={{ background: roleConfig.color }}
      >
        <span className="w-2 h-2 rounded-full bg-white/90 animate-ping inline-block" />
        <span>{roleConfig.title}</span>
      </motion.div>

      {/* ─── 3. WORKSTATION OR CHARACTER STAGE ─── */}
      <div 
        className="relative flex items-center justify-center" 
        style={{ 
          width: showDesk ? size * 1.5 : size, 
          height: showDesk ? size * 1.15 : size * 0.95 
        }}
      >
        {/* Soft Volumetric Ambient Desk Glow */}
        <div 
          className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 pointer-events-none ${
            isBusy ? `${roleConfig.glow} opacity-100 scale-110` :
            isSuccess ? 'bg-emerald-500/25 opacity-90' :
            isError ? 'bg-rose-500/25 opacity-90' :
            'bg-amber-400/10 opacity-50'
          }`} 
        />

        {/* ── SVG ENGINE: CHARACTER & DESK ── */}
        <svg
          viewBox={showDesk ? "0 0 200 160" : "0 0 120 120"}
          className="w-full h-full overflow-visible drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Filters */}
            <filter id={`pixarShadow-${role}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.35" floodColor="#1e1b4b" />
            </filter>
            <filter id={`screenGlow-${role}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Shared Skin Shading */}
            <linearGradient id={`skin-${role}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff1e5" />
              <stop offset="60%" stopColor="#ffd8bd" />
              <stop offset="100%" stopColor="#fcae8c" />
            </linearGradient>

            {/* Desk Gradients */}
            <linearGradient id={`deskSurface-${role}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c59b6d" />
              <stop offset="50%" stopColor="#ad8253" />
              <stop offset="100%" stopColor="#8d6438" />
            </linearGradient>
            <linearGradient id={`deskEdge-${role}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#755027" />
              <stop offset="100%" stopColor="#4a3116" />
            </linearGradient>

            {/* Role-Specific Eye Iris */}
            <radialGradient id={`eyeIris-${role}`} cx="40%" cy="40%" r="60%">
              {role === 'MERKEZ_BANKASI' ? (
                <>
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="70%" stopColor="#7e22ce" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </>
              ) : role === 'KRIPTO' ? (
                <>
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </>
              ) : role === 'KAP' ? (
                <>
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="70%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#064e3b" />
                </>
              ) : role === 'ARSIV' ? (
                <>
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="70%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#581c87" />
                </>
              ) : role === 'AMERIKA' ? (
                <>
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="70%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </>
              ) : role === 'ETF_FONLARI' ? (
                <>
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="70%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#064e3b" />
                </>
              ) : role === 'BORSA' ? (
                <>
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="70%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#312e81" />
                </>
              ) : role === 'HALKA_ARZ' ? (
                <>
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="70%" stopColor="#db2777" />
                  <stop offset="100%" stopColor="#831843" />
                </>
              ) : role === 'HABERLER' ? (
                <>
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="70%" stopColor="#0891b2" />
                  <stop offset="100%" stopColor="#164e63" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="70%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#034b75" />
                </>
              )}
            </radialGradient>

            {/* Role-Specific Suit Gradient */}
            <linearGradient id={`suit-${role}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {role === 'MERKEZ_BANKASI' ? (
                <>
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="60%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </>
              ) : role === 'KRIPTO' ? (
                <>
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="60%" stopColor="#c2410c" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </>
              ) : role === 'KAP' ? (
                <>
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="60%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#064e3b" />
                </>
              ) : role === 'ARSIV' ? (
                <>
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="60%" stopColor="#6d28d9" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </>
              ) : role === 'GATEKEEPER' ? (
                <>
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="60%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </>
              ) : role === 'AMERIKA' ? (
                <>
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="60%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#020617" />
                </>
              ) : role === 'ETF_FONLARI' ? (
                <>
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="60%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#134e4a" />
                </>
              ) : role === 'BORSA' ? (
                <>
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="60%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </>
              ) : role === 'HALKA_ARZ' ? (
                <>
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="60%" stopColor="#be185d" />
                  <stop offset="100%" stopColor="#831843" />
                </>
              ) : role === 'HABERLER' ? (
                <>
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="60%" stopColor="#0e7490" />
                  <stop offset="100%" stopColor="#164e63" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="60%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </>
              )}
            </linearGradient>

            {/* Role-Specific Hair Gradient */}
            <linearGradient id={`hair-${role}`} x1="0%" y1="0%" x2="0%" y2="100%">
              {role === 'MERKEZ_BANKASI' ? (
                <>
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="60%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#475569" />
                </>
              ) : role === 'KRIPTO' ? (
                <>
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="60%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#451a03" />
                </>
              ) : role === 'KAP' ? (
                <>
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="60%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </>
              ) : role === 'ARSIV' ? (
                <>
                  <stop offset="0%" stopColor="#a1a1aa" />
                  <stop offset="60%" stopColor="#52525b" />
                  <stop offset="100%" stopColor="#27272a" />
                </>
              ) : role === 'AMERIKA' ? (
                <>
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#854d0e" />
                </>
              ) : role === 'ETF_FONLARI' ? (
                <>
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="60%" stopColor="#c2410c" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </>
              ) : role === 'BORSA' ? (
                <>
                  <stop offset="0%" stopColor="#3b4252" />
                  <stop offset="60%" stopColor="#2e3440" />
                  <stop offset="100%" stopColor="#1e222a" />
                </>
              ) : role === 'HALKA_ARZ' ? (
                <>
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="60%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </>
              ) : role === 'HABERLER' ? (
                <>
                  <stop offset="0%" stopColor="#d6d3d1" />
                  <stop offset="60%" stopColor="#a8a29e" />
                  <stop offset="100%" stopColor="#44403c" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#3b4252" />
                  <stop offset="60%" stopColor="#2e3440" />
                  <stop offset="100%" stopColor="#1e222a" />
                </>
              )}
            </linearGradient>

            {/* Lamp Light Cone */}
            <linearGradient id={`lampCone-${role}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={role === 'MERKEZ_BANKASI' ? '#4ade80' : '#fef08a'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={role === 'MERKEZ_BANKASI' ? '#4ade80' : '#fef08a'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* ════════════ 1. CONTACT FLOOR SHADOW ════════════ */}
          <ellipse 
            cx={showDesk ? 100 : 60} 
            cy={showDesk ? 148 : 108} 
            rx={showDesk ? 80 : 45} 
            ry={showDesk ? 12 : 8} 
            fill="#000000" 
            fillOpacity="0.28" 
          />

          {/* ════════════ 2. WORKSTATION DESK (FOR BORSA, TCMB, KAP, ARSIV) ════════════ */}
          {showDesk && role !== 'CAT' && role !== 'BACKFILL' && role !== 'GATEKEEPER' && (
            <g id={`desk-${role}`} filter={`url(#pixarShadow-${role})`}>
              {/* Desk Legs */}
              <rect x="35" y="115" width="8" height="32" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="1" />
              <rect x="157" y="115" width="8" height="32" rx="3" fill="#334155" stroke="#1e293b" strokeWidth="1" />

              {/* Desk Bevel / Thickness */}
              <path
                d="M 22 108 L 178 108 Q 183 108 183 113 L 183 118 Q 183 122 178 122 L 22 122 Q 17 122 17 118 L 17 113 Q 17 108 22 108 Z"
                fill={`url(#deskEdge-${role})`}
              />

              {/* Desk Top Surface */}
              <path
                d="M 24 100 Q 100 95 176 100 Q 184 101 184 109 L 180 114 Q 100 118 20 114 L 16 109 Q 16 101 24 100 Z"
                fill={`url(#deskSurface-${role})`}
                stroke="#694620"
                strokeWidth="1.2"
              />

              {/* Desk Highlight */}
              <path
                d="M 28 102 Q 100 97 172 102"
                stroke="#ffd4a3"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* ── DESK LAMP ── */}
              <g id="desk-lamp" transform="translate(24, 60)">
                <polygon points="12,18 -10,50 45,50" fill={`url(#lampCone-${role})`} pointerEvents="none" />
                <ellipse cx="12" cy="46" rx="6" ry="2.5" fill="#1e293b" />
                <path d="M 12 46 Q 6 30 14 18" stroke={role === 'MERKEZ_BANKASI' ? '#15803d' : '#f59e0b'} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M 8 18 Q 14 10 20 18 Z" fill={role === 'MERKEZ_BANKASI' ? '#22c55e' : '#fbbf24'} stroke="#b45309" strokeWidth="1" />
                <circle cx="14" cy="18" r="3.5" fill="#fef08a" />
              </g>

              {/* ── KEYBOARD ── */}
              <g id="keyboard" transform="translate(76, 104)">
                <rect x="0" y="0" width="48" height="11" rx="2.5" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
                <rect x="2" y="1" width="44" height="9" rx="1.5" fill={roleConfig.accent} opacity="0.35" />
                <g fill="#f8fafc" opacity="0.85">
                  <rect x="3" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="8" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="13" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="18" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="23" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="28" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="33" y="2.5" width="4" height="2.5" rx="0.5" />
                  <rect x="38" y="2.5" width="6" height="2.5" rx="0.5" />
                  <rect x="3" y="6" width="6" height="2.5" rx="0.5" />
                  <rect x="10" y="6" width="22" height="2.5" rx="0.5" fill={roleConfig.accent} />
                  <rect x="33" y="6" width="5" height="2.5" rx="0.5" />
                  <rect x="39" y="6" width="5" height="2.5" rx="0.5" />
                </g>
              </g>

              {/* ── MOUSE ── */}
              <g id="mouse" transform="translate(130, 105)">
                <rect x="0" y="0" width="16" height="10" rx="2" fill="#0f172a" opacity="0.6" />
                <ellipse cx="8" cy="5" rx="4" ry="3.5" fill="#334155" stroke="#0f172a" strokeWidth="0.5" />
                <line x1="8" y1="2" x2="8" y2="5" stroke={roleConfig.accent} strokeWidth="0.8" />
              </g>

              {/* ── COFFEE / TEA MUG ── */}
              <g id="mug" transform="translate(56, 96)">
                <rect x="0" y="4" width="9" height="10" rx="2" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
                <path d="M 9 6 Q 13 8 9 11" stroke="#cbd5e1" strokeWidth="1.2" fill="none" />
                <ellipse cx="4.5" cy="5" rx="3.5" ry="1.5" fill={role === 'MERKEZ_BANKASI' ? '#991b1b' : '#78350f'} />
                <motion.path
                  d="M 3 3 Q 1 0 3 -2"
                  stroke="#cbd5e1"
                  strokeWidth="0.8"
                  fill="none"
                  strokeLinecap="round"
                  animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </g>

              {/* ── ACCESSORIES (Plants / Post-Its / Calculators) ── */}
              {role === 'MERKEZ_BANKASI' ? (
                <g id="tcmb-gold-calc" transform="translate(150, 98) rotate(4)">
                  <rect x="0" y="0" width="12" height="13" rx="1.5" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.6" />
                  <rect x="1.5" y="1.5" width="9" height="3" rx="0.5" fill="#fef08a" />
                  <text x="3" y="3.8" fill="#1e293b" fontSize="2.2" fontFamily="monospace" fontWeight="bold">50.0%</text>
                  <circle cx="3" cy="6.5" r="0.8" fill="#cbd5e1" />
                  <circle cx="6" cy="6.5" r="0.8" fill="#cbd5e1" />
                  <circle cx="9" cy="6.5" r="0.8" fill="#cbd5e1" />
                  <circle cx="3" cy="9.5" r="0.8" fill="#cbd5e1" />
                  <circle cx="6" cy="9.5" r="0.8" fill="#ef4444" />
                  <circle cx="9" cy="9.5" r="0.8" fill="#22c55e" />
                </g>
              ) : role === 'KAP' ? (
                <g id="ai-smart-pad" transform="translate(150, 97) rotate(6)">
                  <rect x="0" y="0" width="13" height="14" rx="2" fill="#0f172a" stroke="#10b981" strokeWidth="0.7" />
                  <rect x="1" y="1" width="11" height="12" rx="1" fill="#022c22" />
                  <circle cx="6.5" cy="5" r="2.5" fill="#10b981" opacity="0.6" />
                  <line x1="2" y1="9" x2="11" y2="9" stroke="#34d399" strokeWidth="0.6" />
                  <line x1="2" y1="11" x2="8" y2="11" stroke="#34d399" strokeWidth="0.6" />
                </g>
              ) : role === 'ARSIV' ? (
                <g id="sql-binder" transform="translate(150, 97) rotate(-4)">
                  <rect x="0" y="0" width="14" height="13" rx="1" fill="#581c87" stroke="#7c3aed" strokeWidth="0.7" />
                  <line x1="3" y1="2" x2="3" y2="11" stroke="#c084fc" strokeWidth="1" />
                  <text x="5" y="6" fill="#f3e8ff" fontSize="2.5" fontFamily="monospace" fontWeight="bold">SQL</text>
                </g>
              ) : role === 'KRIPTO' ? (
                <g id="btc-coin" transform="translate(152, 97) rotate(12)">
                  <circle cx="6" cy="6" r="6" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
                  <circle cx="6" cy="6" r="4.5" fill="#fbbf24" />
                  <text x="3.5" y="8.5" fill="#b45309" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">₿</text>
                </g>
              ) : (
                <g id="succulent" transform="translate(166, 95)">
                  <path d="M 0 5 L 7 5 L 6 12 L 1 12 Z" fill="#ea580c" stroke="#9a3412" strokeWidth="0.8" />
                  <circle cx="2" cy="3" r="2.5" fill="#22c55e" />
                  <circle cx="5" cy="3" r="2.5" fill="#16a34a" />
                  <circle cx="3.5" cy="1.5" r="2" fill="#4ade80" />
                </g>
              )}

              {/* ── SCREENS ── */}
              {/* Left Screen */}
              <g id="screen-left" transform="translate(42, 58) rotate(4)">
                <rect x="22" y="32" width="6" height="12" fill="#1e293b" />
                <ellipse cx="25" cy="44" rx="10" ry="3" fill="#0f172a" />
                <rect x="0" y="0" width="50" height="34" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                <rect x="2" y="2" width="46" height="30" rx="2.5" fill="#020617" />
                
                <g filter={`url(#screenGlow-${role})`}>
                  {role === 'MERKEZ_BANKASI' ? (
                    <>
                      <text x="5" y="7" fill="#ef4444" fontSize="3.5" fontFamily="monospace" fontWeight="bold">TCMB EVDS %50.0</text>
                      <line x1="4" y1="12" x2="46" y2="12" stroke="#1e293b" strokeWidth="0.5" />
                      <line x1="4" y1="20" x2="46" y2="20" stroke="#1e293b" strokeWidth="0.5" />
                      <path d="M 6 26 Q 16 14 26 18 T 44 8" stroke="#ef4444" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      <text x="5" y="28" fill="#fca5a5" fontSize="2.8" fontFamily="monospace">POLİTİKA FAİZİ</text>
                    </>
                  ) : role === 'KAP' ? (
                    <>
                      <text x="5" y="7" fill="#10b981" fontSize="3.5" fontFamily="monospace" fontWeight="bold">KAP CANLI AI</text>
                      <rect x="5" y="11" width="38" height="4" rx="1" fill="#064e3b" />
                      <text x="7" y="14" fill="#a7f3d0" fontSize="2.4" fontFamily="monospace">[YENİ BİLDİRİM] THYAO</text>
                      <rect x="5" y="17" width="38" height="4" rx="1" fill="#064e3b" />
                      <text x="7" y="20" fill="#a7f3d0" fontSize="2.4" fontFamily="monospace">[ÖDA] EREGL KAP</text>
                      <circle cx="42" cy="7" r="1.5" fill="#10b981" className="animate-ping" />
                    </>
                  ) : role === 'ARSIV' ? (
                    <>
                      <text x="5" y="7" fill="#c084fc" fontSize="3.5" fontFamily="monospace" fontWeight="bold">POSTGRESQL DB</text>
                      <text x="5" y="14" fill="#a855f7" fontSize="2.5" fontFamily="monospace">SELECT * FROM bist_100</text>
                      <text x="5" y="19" fill="#10b981" fontSize="2.5" fontFamily="monospace">STATUS: CONNECTED (OK)</text>
                      <text x="5" y="24" fill="#e9d5ff" fontSize="2.5" fontFamily="monospace">ROWS: 1.48M INDEXED</text>
                    </>
                  ) : role === 'KRIPTO' ? (
                    <>
                      <text x="5" y="7" fill="#f59e0b" fontSize="3.5" fontFamily="monospace" fontWeight="bold">BTC/USDT</text>
                      <text x="5" y="14" fill="#fbbf24" fontSize="4.5" fontFamily="monospace" fontWeight="bold">$64,230</text>
                      <text x="33" y="14" fill="#4ade80" fontSize="3" fontFamily="monospace" fontWeight="bold">+1.2%</text>
                      <path d="M 5 24 Q 15 26 22 18 T 44 8" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
                    </>
                  ) : (
                    <>
                      <text x="5" y="7" fill="#38bdf8" fontSize="3.5" fontFamily="monospace" fontWeight="bold">XU100 ▲ 10,482</text>
                      <text x="33" y="7" fill="#4ade80" fontSize="3" fontFamily="monospace" fontWeight="bold">+2.8%</text>
                      <rect x="8" y="16" width="2" height="8" fill="#10b981" />
                      <rect x="14" y="18" width="2" height="6" fill="#f43f5e" />
                      <rect x="20" y="12" width="2" height="9" fill="#10b981" />
                      <rect x="26" y="9" width="2" height="8" fill="#10b981" />
                      <path d="M 6 24 Q 16 22 22 14 T 44 6" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
                    </>
                  )}
                </g>
              </g>

              {/* Right Screen */}
              <g id="screen-right" transform="translate(108, 58) rotate(-4)">
                <rect x="22" y="32" width="6" height="12" fill="#1e293b" />
                <ellipse cx="25" cy="44" rx="10" ry="3" fill="#0f172a" />
                <rect x="0" y="0" width="50" height="34" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                <rect x="2" y="2" width="46" height="30" rx="2.5" fill="#020617" />
                
                <g filter={`url(#screenGlow-${role})`}>
                  <text x="5" y="7" fill={roleConfig.accent} fontSize="3.5" fontFamily="monospace" fontWeight="bold">
                    {role === 'MERKEZ_BANKASI' ? 'USD/TRY & TÜFE' :
                     role === 'KAP' ? 'AI NLP ANALİZİ' :
                     role === 'ARSIV' ? 'QUERY RUNNER' :
                     role === 'KRIPTO' ? 'ON-CHAIN DATA' : 'ORDERBOOK / DERİNLİK'}
                  </text>
                  <rect x="5" y="11" width="22" height="2.5" rx="0.5" fill="#10b981" opacity="0.8" />
                  <rect x="5" y="15" width="28" height="2.5" rx="0.5" fill="#10b981" opacity="0.9" />
                  <rect x="5" y="19" width="16" height="2.5" rx="0.5" fill="#f43f5e" opacity="0.8" />
                  <rect x="5" y="23" width="24" height="2.5" rx="0.5" fill="#f43f5e" opacity="0.9" />
                  <circle cx="43" cy="6" r="1.5" fill={roleConfig.accent} className={isBusy ? 'animate-ping' : ''} />
                </g>
              </g>
            </g>
          )}

          {/* ════════════ 3. SPECIAL ROLE: CAT (BISTy) ════════════ */}
          {role === 'CAT' && (
            <g id="pixar-cat" transform="translate(60, 55)">
              <motion.g
                animate={isBusy ? { y: [0, -3, 0] } : { y: [0, -1.5, 0] }}
                transition={{ repeat: Infinity, duration: isBusy ? 0.8 : 2.0, ease: 'easeInOut' }}
              >
                {/* Cozy Cushion */}
                <ellipse cx="0" cy="35" rx="38" ry="14" fill="#9a3412" stroke="#7c2d12" strokeWidth="1.5" />
                <ellipse cx="0" cy="34" rx="34" ry="11" fill="#ea580c" />
                <ellipse cx="0" cy="33" rx="28" ry="8" fill="#f97316" />

                {/* Cat Chubby Body */}
                <ellipse cx="0" cy="18" rx="22" ry="16" fill="#f97316" stroke="#c2410c" strokeWidth="1.2" />
                {/* White Chest Patch */}
                <ellipse cx="0" cy="20" rx="12" ry="10" fill="#ffedd5" />

                {/* Animated Wagging Tail */}
                <motion.path
                  d="M 18 20 Q 32 10 30 -2"
                  stroke="#ea580c"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ rotate: [-6, 12, -6] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  style={{ transformOrigin: '18px 20px' }}
                />

                {/* Cat Chubby Head */}
                <circle cx="0" cy="0" r="16" fill="#f97316" stroke="#c2410c" strokeWidth="1.2" />
                <ellipse cx="-7" cy="4" rx="3.5" ry="2" fill="#ff708d" opacity="0.4" />
                <ellipse cx="7" cy="4" rx="3.5" ry="2" fill="#ff708d" opacity="0.4" />

                {/* Cat Ears */}
                <polygon points="-12,-10 -6,-22 0,-12" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
                <polygon points="-10,-10 -6,-18 -2,-12" fill="#fed7aa" />
                
                <polygon points="0,-12 6,-22 12,-10" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
                <polygon points="2,-12 6,-18 10,-10" fill="#fed7aa" />

                {/* Big Green Pixar Eyes */}
                <circle cx="-5" cy="-2" r="4.5" fill="#22c55e" stroke="#15803d" strokeWidth="0.6" />
                <circle cx="-5" cy="-2" r="2.8" fill="#052e16" />
                <circle cx="-6.2" cy="-3.5" r="1.5" fill="#ffffff" />
                <circle cx="-4" cy="-1" r="0.8" fill="#ffffff" />

                <circle cx="5" cy="-2" r="4.5" fill="#22c55e" stroke="#15803d" strokeWidth="0.6" />
                <circle cx="5" cy="-2" r="2.8" fill="#052e16" />
                <circle cx="3.8" cy="-3.5" r="1.5" fill="#ffffff" />
                <circle cx="6" cy="-1" r="0.8" fill="#ffffff" />

                {/* Cute Pink Nose & Whiskers */}
                <polygon points="-1.5,3 1.5,3 0,4.5" fill="#f43f5e" />
                <path d="M -1.5 4.5 Q -3 6.5 -5 5.5" stroke="#9a3412" strokeWidth="0.8" fill="none" />
                <path d="M 1.5 4.5 Q 3 6.5 5 5.5" stroke="#9a3412" strokeWidth="0.8" fill="none" />

                {/* Whiskers */}
                <line x1="-7" y1="3" x2="-14" y2="1" stroke="#fdba74" strokeWidth="0.8" />
                <line x1="-7" y1="5" x2="-14" y2="6" stroke="#fdba74" strokeWidth="0.8" />
                <line x1="7" y1="3" x2="14" y2="1" stroke="#fdba74" strokeWidth="0.8" />
                <line x1="7" y1="5" x2="14" y2="6" stroke="#fdba74" strokeWidth="0.8" />

                {/* Cute Mini Stock Tag / Collar */}
                <circle cx="0" cy="12" r="3" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />
                <text x="-1.8" y="13.2" fill="#713f12" fontSize="2.8" fontWeight="bold" fontFamily="monospace">₺</text>
              </motion.g>
            </g>
          )}

          {/* ════════════ 4. SPECIAL ROLE: BACKFILL (5Y Gece Botu) ════════════ */}
          {role === 'BACKFILL' && (
            <g id="pixar-bot" transform="translate(60, 52)">
              <motion.g
                animate={isBusy ? { y: [0, -3, 0], rotate: [-1, 1, -1] } : { y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: isBusy ? 0.6 : 1.5, ease: 'easeInOut' }}
              >
                {/* Jet / Floating Energy Ring */}
                <ellipse cx="0" cy="42" rx="22" ry="6" fill="#f59e0b" opacity="0.4" className="animate-pulse" />
                <ellipse cx="0" cy="40" rx="14" ry="4" fill="#fbbf24" opacity="0.8" />

                {/* Bot Wheel Base */}
                <rect x="-10" y="30" width="20" height="12" rx="5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
                <circle cx="0" cy="36" r="4" fill="#f59e0b" />

                {/* Bot Body (Chubby Cute Capsule) */}
                <rect x="-18" y="4" width="36" height="28" rx="12" fill="#334155" stroke="#0f172a" strokeWidth="1.5" />
                <rect x="-15" y="7" width="30" height="22" rx="9" fill="#475569" />

                {/* Glowing Data Battery Core */}
                <rect x="-10" y="11" width="20" height="12" rx="4" fill="#0f172a" />
                <rect x="-8" y="13" width="16" height="8" rx="2" fill="#06b6d4" className={isBusy ? 'animate-pulse' : ''} />
                <text x="-6.5" y="19" fill="#ffffff" fontSize="4" fontFamily="monospace" fontWeight="bold">5Y:BOT</text>

                {/* Robotic Jetpack Arms carrying Data Bag */}
                <motion.g animate={isBusy ? { rotate: [6, -6, 6] } : {}}>
                  <rect x="-24" y="12" width="6" height="14" rx="3" fill="#64748b" />
                  <rect x="18" y="12" width="6" height="14" rx="3" fill="#64748b" />
                </motion.g>

                {/* Bot Cute Head */}
                <rect x="-16" y="-18" width="32" height="22" rx="10" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                
                {/* Big Cyber Screen Face */}
                <rect x="-13" y="-15" width="26" height="16" rx="6" fill="#020617" />
                
                {/* Glowing Expressive Eyes */}
                <motion.g animate={isBusy ? { scale: [1, 1.08, 1] } : {}}>
                  <ellipse cx="-6" cy="-7" rx="4" ry="4.5" fill="#38bdf8" />
                  <ellipse cx="6" cy="-7" rx="4" ry="4.5" fill="#38bdf8" />
                  <circle cx="-7" cy="-8.5" r="1.5" fill="#ffffff" />
                  <circle cx="5" cy="-8.5" r="1.5" fill="#ffffff" />
                </motion.g>

                {/* Bot Antenna with Pulsating Orb */}
                <line x1="0" y1="-18" x2="0" y2="-28" stroke="#64748b" strokeWidth="2.5" />
                <circle cx="0" cy="-28" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" className={isBusy ? 'animate-ping' : ''} />
                <circle cx="0" cy="-28" r="3" fill="#fef08a" />
              </motion.g>
            </g>
          )}

          {/* ════════════ 5. SPECIAL ROLE: GATEKEEPER (Güvenlik) ════════════ */}
          {role === 'GATEKEEPER' && (
            <g id="pixar-security" transform="translate(60, 52)">
              <motion.g
                animate={isBusy ? { y: [0, -2, 0] } : { y: [0, -1.5, 0] }}
                transition={{ repeat: Infinity, duration: isBusy ? 0.6 : 2.0, ease: 'easeInOut' }}
              >
                {/* Body / Security Blazer */}
                <path d="M -14 10 Q 0 8 14 10 L 16 34 Q 0 36 -16 34 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
                <polygon points="-6,10 6,10 0,18" fill="#ffffff" />
                <polygon points="-2,15 2,15 2,26 -2,26" fill="#0f172a" />
                {/* Golden Security Badge */}
                <circle cx="-8" cy="18" r="2.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />

                {/* Left Arm with Walkie-Talkie */}
                <path d="M -14 12 Q -22 20 -20 28" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                <rect x="-24" y="24" width="5" height="10" rx="1.5" fill="#0f172a" />
                <line x1="-22" y1="24" x2="-22" y2="18" stroke="#64748b" strokeWidth="1.5" />

                {/* Right Arm */}
                <path d="M 14 12 Q 22 20 20 28" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="20" cy="30" rx="3" ry="3" fill="url(#skin-GATEKEEPER)" />

                {/* Head */}
                <path d="M -16 -8 C -16 -24 16 -24 16 -8 C 17 6 13 14 0 14 C -13 14 -17 6 -16 -8 Z" fill="url(#skin-GATEKEEPER)" stroke="#d48b70" strokeWidth="1.2" />
                
                {/* Peaked Security Cap */}
                <path d="M -18 -12 Q 0 -28 18 -12 L 20 -6 Q 0 -12 -20 -6 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
                <path d="M -22 -6 Q 0 -10 22 -6" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="0" cy="-14" r="2.5" fill="#facc15" />

                {/* Big Eyes */}
                <circle cx="-6" cy="-2" r="4.5" fill="#ffffff" stroke="#c27d66" strokeWidth="0.5" />
                <circle cx="-6" cy="-2" r="3" fill="#0284c7" />
                <circle cx="-6" cy="-2" r="1.8" fill="#0f172a" />
                <circle cx="-7.2" cy="-3.2" r="1.2" fill="#ffffff" />

                <circle cx="6" cy="-2" r="4.5" fill="#ffffff" stroke="#c27d66" strokeWidth="0.5" />
                <circle cx="6" cy="-2" r="3" fill="#0284c7" />
                <circle cx="6" cy="-2" r="1.8" fill="#0f172a" />
                <circle cx="4.8" cy="-3.2" r="1.2" fill="#ffffff" />

                {/* Cute Mustache / Smile */}
                <path d="M -4 5 Q 0 8 4 5" stroke="#78350f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              </motion.g>
            </g>
          )}

          {/* ════════════ 6. STANDARD PIXAR CHARACTER (FOR BORSA, TCMB, KAP, ARSIV) ════════════ */}
          {role !== 'CAT' && role !== 'BACKFILL' && role !== 'GATEKEEPER' && (
            <g id="pixar-character" transform="translate(100, 78)">
              <motion.g
                animate={
                  isBusy
                    ? { y: [0, -3, 0], rotate: [0, 1.5, -1.5, 0] }
                    : isSuccess
                    ? { y: [0, -5, 0], scale: [1, 1.04, 1] }
                    : isError
                    ? { x: [-1.5, 1.5, -1.5, 0] }
                    : { y: [0, -1.8, 0] }
                }
                transition={{
                  repeat: Infinity,
                  duration: isBusy ? 0.6 : isSuccess ? 0.5 : isError ? 0.35 : 2.0,
                  ease: 'easeInOut'
                }}
              >
                {/* Ergonomic Office Chair */}
                <g id="chair-back" transform="translate(-24, -30)">
                  <rect x="0" y="0" width="48" height="52" rx="14" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                  <rect x="3" y="3" width="42" height="46" rx="11" fill="#334155" />
                  <rect x="6" y="26" width="36" height="18" rx="6" fill="#475569" />
                </g>

                {/* Torso / Outfit */}
                <g id="torso" transform="translate(-16, -2)">
                  <path d="M 4 8 Q 16 6 28 8 L 30 28 Q 16 31 2 28 Z" fill={`url(#suit-${role})`} stroke="#0f172a" strokeWidth="1.2" />
                  <polygon points="12,8 20,8 16,18" fill="#ffffff" />
                  <polygon points="15,14 17,14 18,24 16,27 14,24" fill={roleConfig.accent} />
                  <circle cx="9" cy="14" r="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.5" />
                  {role === 'KRIPTO' && (
                    <text x="21" y="18" fill="#facc15" fontSize="4" fontWeight="bold" fontFamily="sans-serif">₿</text>
                  )}
                </g>

                {/* Left Arm */}
                <g id="arm-left" transform="translate(-24, 0)">
                  <motion.g
                    animate={
                      isBusy
                        ? { rotate: [16, 32, 16], y: [0, 3, 0] }
                        : isSuccess
                        ? { rotate: [-120, -135, -120], y: [-6, -10, -6] }
                        : { rotate: [12, 16, 12] }
                    }
                    transition={{ repeat: Infinity, duration: isBusy ? 0.38 : 2.0, ease: 'easeInOut' }}
                    style={{ transformOrigin: '8px 2px' }}
                  >
                    <path d="M 8 2 Q 4 14 2 24 L 9 25 Q 12 14 14 2 Z" fill={`url(#suit-${role})`} stroke="#0f172a" strokeWidth="1" />
                    <ellipse cx="5" cy="27" rx="3.5" ry="3" fill={`url(#skin-${role})`} stroke="#e29578" strokeWidth="0.8" />
                  </motion.g>
                </g>

                {/* Right Arm */}
                <g id="arm-right" transform="translate(10, 0)">
                  <motion.g
                    animate={
                      isBusy
                        ? { rotate: [-24, -38, -24], y: [2, 0, 2] }
                        : isSuccess
                        ? { rotate: [120, 135, 120], y: [-6, -10, -6] }
                        : { rotate: [-12, -16, -12] }
                    }
                    transition={{ repeat: Infinity, duration: isBusy ? 0.38 : 2.0, ease: 'easeInOut' }}
                    style={{ transformOrigin: '6px 2px' }}
                  >
                    <path d="M 6 2 Q 10 14 12 24 L 5 25 Q 2 14 0 2 Z" fill={`url(#suit-${role})`} stroke="#0f172a" strokeWidth="1" />
                    <ellipse cx="9" cy="27" rx="3.5" ry="3" fill={`url(#skin-${role})`} stroke="#e29578" strokeWidth="0.8" />
                  </motion.g>
                </g>

                {/* Head & Face */}
                <g id="head" transform="translate(0, -22)">
                  <motion.g
                    animate={isIdle ? { rotate: [0, 2, -2, 0] } : isBusy ? { rotate: [0, -2, 2, 0], y: [0, 1.2, 0] } : {}}
                    transition={{ repeat: Infinity, duration: isIdle ? 4 : isBusy ? 0.6 : 1.0, ease: 'easeInOut' }}
                    style={{ transformOrigin: '0px 10px' }}
                  >
                    {/* Head Shape */}
                    <path
                      d="M -22 -14 C -22 -32 22 -32 22 -14 C 23 4 18 16 0 16 C -18 16 -23 4 -22 -14 Z"
                      fill={`url(#skin-${role})`}
                      stroke="#d48b70"
                      strokeWidth="1.2"
                    />

                    {/* Cheeks */}
                    <ellipse cx="-13" cy="2" rx="5" ry="3" fill="#ff708d" opacity="0.4" />
                    <ellipse cx="13" cy="2" rx="5" ry="3" fill="#ff708d" opacity="0.4" />

                    {/* Ears */}
                    <ellipse cx="-23" cy="-4" rx="3.5" ry="5" fill={`url(#skin-${role})`} stroke="#d48b70" strokeWidth="0.8" />
                    <ellipse cx="23" cy="-4" rx="3.5" ry="5" fill={`url(#skin-${role})`} stroke="#d48b70" strokeWidth="0.8" />

                    {/* Role Accessories: TCMB Glasses, KAP Cyber Headband, vs */}
                    {role === 'MERKEZ_BANKASI' ? (
                      /* Classic Gold Frame Glasses */
                      <g id="tcmb-glasses" transform="translate(0, -4)">
                        <circle cx="-9" cy="0" r="7.5" fill="none" stroke="#f59e0b" strokeWidth="1.6" />
                        <circle cx="9" cy="0" r="7.5" fill="none" stroke="#f59e0b" strokeWidth="1.6" />
                        <line x1="-1.5" y1="0" x2="1.5" y2="0" stroke="#f59e0b" strokeWidth="1.6" />
                        <line x1="-16.5" y1="0" x2="-22" y2="-2" stroke="#f59e0b" strokeWidth="1.4" />
                        <line x1="16.5" y1="0" x2="22" y2="-2" stroke="#f59e0b" strokeWidth="1.4" />
                      </g>
                    ) : role === 'HABERLER' ? (
                      /* Modern Stylish Glasses */
                      <g id="haberler-glasses" transform="translate(0, -4)">
                        <rect x="-16" y="-3" width="14" height="9" rx="3" fill="none" stroke="#083344" strokeWidth="2.5" />
                        <rect x="2" y="-3" width="14" height="9" rx="3" fill="none" stroke="#083344" strokeWidth="2.5" />
                        <line x1="-2" y1="0" x2="2" y2="0" stroke="#083344" strokeWidth="2.5" />
                      </g>
                    ) : role === 'HALKA_ARZ' ? (
                      /* Pearl earrings and simple headset */
                      <g id="halka-arz-acc" transform="translate(0, -4)">
                         <circle cx="-23" cy="3" r="2.5" fill="#fdf8f6" stroke="#e7e5e4" strokeWidth="0.5" />
                         <circle cx="23" cy="3" r="2.5" fill="#fdf8f6" stroke="#e7e5e4" strokeWidth="0.5" />
                         <path d="M 23 -3 Q 25 8 10 9" stroke="#9d174d" strokeWidth="1.2" fill="none" />
                         <circle cx="9" cy="9" r="1.5" fill="#ec4899" />
                      </g>
                    ) : role === 'KAP' ? (
                      /* Futuristic Cyber Headset */
                      <g id="kap-headset">
                        <path d="M -24 -6 C -24 -36 24 -36 24 -6" stroke="#10b981" strokeWidth="2.2" fill="none" />
                        <rect x="-26" y="-10" width="4" height="10" rx="2" fill="#064e3b" />
                        <rect x="22" y="-10" width="4" height="10" rx="2" fill="#064e3b" />
                        <path d="M 23 -3 Q 25 8 10 9" stroke="#064e3b" strokeWidth="1.2" fill="none" />
                        <circle cx="9" cy="9" r="2" fill="#10b981" className="animate-ping" />
                      </g>
                    ) : role === 'KRIPTO' ? (
                      /* Miner Hard Hat */
                      <g id="miner-hat" transform="translate(0, -13)">
                        <path d="M -15 0 C -15 -14 15 -14 15 0" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                        <rect x="-17" y="0" width="34" height="3" rx="1.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                        {/* Flashlight on hat */}
                        <rect x="-4.5" y="-12" width="9" height="6" rx="2" fill="#334155" />
                        <circle cx="0" cy="-9" r="2" fill="#fef08a" />
                        {isBusy && <polygon points="-3,-9 3,-9 12,-35 -12,-35" fill="#fef08a" opacity="0.25" />}
                      </g>
                    ) : (
                      /* FinTech Headset */
                      <g id="fintech-headset">
                        <path d="M -24 -6 C -24 -36 24 -36 24 -6" stroke="#475569" strokeWidth="2.2" fill="none" />
                        <rect x="-26" y="-10" width="4" height="10" rx="2" fill="#0f172a" />
                        <rect x="22" y="-10" width="4" height="10" rx="2" fill="#0f172a" />
                        <path d="M 23 -3 Q 25 8 10 9" stroke="#0f172a" strokeWidth="1.2" fill="none" />
                        <circle cx="9" cy="9" r="2" fill={roleConfig.accent} />
                      </g>
                    )}

                    {/* Big Pixar Eyes */}
                    <g id="eyes" transform="translate(0, -4)">
                      {/* Left Eye */}
                      <ellipse cx="-9" cy="0" rx="6.5" ry="7.5" fill="#ffffff" stroke="#c27d66" strokeWidth="0.6" />
                      <circle cx="-9" cy="0" r="4.8" fill={`url(#eyeIris-${role})`} />
                      <circle cx="-9" cy="0" r="2.8" fill="#0a192f" />
                      <circle cx="-10.5" cy="-2" r="1.8" fill="#ffffff" />
                      <circle cx="-7.4" cy="1.6" r="0.9" fill="#ffffff" opacity="0.9" />

                      {/* Right Eye */}
                      <ellipse cx="9" cy="0" rx="6.5" ry="7.5" fill="#ffffff" stroke="#c27d66" strokeWidth="0.6" />
                      <circle cx="9" cy="0" r="4.8" fill={`url(#eyeIris-${role})`} />
                      <circle cx="9" cy="0" r="2.8" fill="#0a192f" />
                      <circle cx="7.5" cy="-2" r="1.8" fill="#ffffff" />
                      <circle cx="10.6" cy="1.6" r="0.9" fill="#ffffff" opacity="0.9" />

                      {/* Blink */}
                      <motion.rect
                        x="-16"
                        y="-8"
                        width="32"
                        height="16"
                        fill={`url(#skin-${role})`}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: [0, 0, 0, 1, 0, 0] }}
                        transition={{ repeat: Infinity, duration: 4.5, times: [0, 0.85, 0.9, 0.93, 0.96, 1] }}
                        style={{ transformOrigin: '0px -8px' }}
                      />
                    </g>

                    {/* Eyebrows */}
                    <path d="M -16 -13 Q -9 -17 -3 -13" stroke="#2e3440" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M 3 -13 Q 9 -17 16 -13" stroke="#2e3440" strokeWidth="2" strokeLinecap="round" fill="none" />

                    {/* Nose & Smile */}
                    <ellipse cx="0" cy="2" rx="2" ry="1.2" fill="#f2957b" />
                    <path d="M -4 7 Q 0 11 4 7" stroke="#8c4734" strokeWidth="1.6" fill="none" strokeLinecap="round" />

                    {/* Hair */}
                    {role === 'HALKA_ARZ' ? (
                      <path
                        d="M -23 -10 C -25 -32 10 -38 23 -22 C 25 -10 24 15 14 15 C 10 15 12 -20 -6 -24 C -14 -18 -18 15 -24 15 C -25 15 -21 -5 -23 -10 Z"
                        fill={`url(#hair-${role})`}
                      />
                    ) : role === 'HABERLER' ? (
                      <path
                        d="M -23 -10 C -28 -35 15 -35 23 -22 C 25 -5 30 18 20 20 C 12 22 14 -15 -4 -22 C -14 -16 -28 20 -20 18 C -15 15 -18 -5 -23 -10 Z"
                        fill={`url(#hair-${role})`}
                      />
                    ) : (
                      <path
                        d="M -23 -10 C -25 -32 10 -38 23 -22 C 25 -10 18 -4 14 -12 C 10 -20 -6 -24 -14 -18 C -18 -15 -21 -5 -23 -10 Z"
                        fill={`url(#hair-${role})`}
                      />
                    )}
                  </motion.g>
                </g>
              </motion.g>
            </g>
          )}
        </svg>
      </div>

      {/* ─── 4. PULSATING STATUS INDICATOR HUD ─── */}
      <div className="mt-1 flex items-center gap-2 bg-neutral-900/90 dark:bg-black/90 px-3 py-1 rounded-full border border-neutral-700 shadow-md">
        <span className="relative flex h-2.5 w-2.5">
          <span 
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isBusy ? 'bg-cyan-400' :
              isSuccess ? 'bg-emerald-400' :
              isError ? 'bg-rose-500' :
              isCooldown ? 'bg-amber-400' : 'bg-neutral-400'
            }`} 
          />
          <span 
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isBusy ? 'bg-cyan-500' :
              isSuccess ? 'bg-emerald-500' :
              isError ? 'bg-rose-500' :
              isCooldown ? 'bg-amber-500' : 'bg-neutral-500'
            }`} 
          />
        </span>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-200">
          {status === 'BUSY' ? `${roleConfig.title} AKTİF` : status}
        </span>
      </div>
    </div>
  );
});

PixarOfficeCharacter.displayName = 'PixarOfficeCharacter';
