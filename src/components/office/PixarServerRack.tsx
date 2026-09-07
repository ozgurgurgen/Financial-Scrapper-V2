import React from 'react';
import { motion } from 'motion/react';
import { Database, Activity, HardDrive, Cpu } from 'lucide-react';

export interface PixarServerRackProps {
  label?: string;
  isProcessing?: boolean;
  recordCount?: number;
  size?: number; // base scale
  onClick?: () => void;
}

export const PixarServerRack: React.FC<PixarServerRackProps> = React.memo(({
  label = 'POSTGRESQL CLUSTER',
  isProcessing = false,
  recordCount = 1480000,
  size = 130,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className="relative flex flex-col items-center select-none group cursor-pointer transition-transform duration-300 hover:scale-105"
      style={{ width: size * 1.1, height: size * 1.35 }}
    >
      {/* ── Volumetric Ambient Cyber-Glow ── */}
      <div 
        className={`absolute inset-0 rounded-3xl blur-xl transition-all duration-500 pointer-events-none ${
          isProcessing 
            ? 'bg-purple-500/35 opacity-100 scale-110' 
            : 'bg-indigo-500/20 opacity-80'
        }`} 
      />

      {/* ── Status HUD Top Tag ── */}
      <div className="z-20 -mb-2 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold text-cyan-300 bg-neutral-900/90 border border-purple-500/60 shadow-md flex items-center gap-1.5 backdrop-blur-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
        <span>PG:SQL CLUSTER</span>
      </div>

      {/* ── Pixar 3D SVG Server Tower ── */}
      <svg
        viewBox="0 0 140 180"
        className="w-full h-full overflow-visible drop-shadow-xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="serverCabinet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="cabinetBevel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#3b0764" />
          </linearGradient>

          <linearGradient id="glassDoor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.25" />
          </linearGradient>

          <linearGradient id="coolantLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>

          <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Floor Shadow ── */}
        <ellipse cx="70" cy="172" rx="60" ry="8" fill="#000000" fillOpacity="0.35" />

        {/* ── Main Outer Chassis / Cabinet ── */}
        <g id="server-chassis">
          {/* Base Stand Feet */}
          <rect x="18" y="160" width="16" height="8" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
          <rect x="106" y="160" width="16" height="8" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />

          {/* Cabinet Body */}
          <rect 
            x="12" 
            y="14" 
            width="116" 
            height="150" 
            rx="14" 
            fill="url(#serverCabinet)" 
            stroke="url(#cabinetBevel)" 
            strokeWidth="2.5" 
          />

          {/* Top Aerodynamic Air Exhaust Grid */}
          <g transform="translate(24, 20)">
            <rect x="0" y="0" width="92" height="6" rx="2" fill="#090d16" />
            <circle cx="8" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="16" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="24" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="32" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="40" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="48" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="56" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="64" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="72" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="80" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="88" cy="3" r="1.5" fill="#38bdf8" opacity="0.6" />
          </g>

          {/* ── 1. TOP BLADE TRAY: CPU & AI ACCELERATOR ── */}
          <g id="blade-1" transform="translate(20, 32)">
            <rect x="0" y="0" width="100" height="26" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            
            {/* Status Screen */}
            <rect x="6" y="4" width="46" height="18" rx="3" fill="#020617" stroke="#1e293b" strokeWidth="0.8" />
            <g filter="url(#neonBlur)">
              <text x="10" y="11" fill="#38bdf8" fontSize="4" fontFamily="monospace" fontWeight="bold">POSTGRESQL 16</text>
              <text x="10" y="17" fill="#4ade80" fontSize="3.2" fontFamily="monospace">99.99% UPTIME</text>
            </g>

            {/* Glowing Cooling Fan */}
            <g transform="translate(62, 13)">
              <circle cx="0" cy="0" r="7" fill="#020617" stroke="#3b82f6" strokeWidth="1" />
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: isProcessing ? 0.8 : 3, ease: 'linear' }}
              >
                <line x1="-5" y1="0" x2="5" y2="0" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
              </motion.g>
            </g>

            {/* Pulsing LEDs */}
            <g transform="translate(80, 7)">
              <circle cx="0" cy="0" r="2" fill="#22c55e" className="animate-ping" />
              <circle cx="0" cy="0" r="1.5" fill="#4ade80" />
              <circle cx="8" cy="0" r="1.5" fill="#38bdf8" />
              <circle cx="0" cy="7" r="1.5" fill="#a855f7" />
              <circle cx="8" cy="7" r="1.5" fill="#f59e0b" />
            </g>
          </g>

          {/* ── 2. MIDDLE BLADE TRAY: NVMe ARRAY (BIST & HISTORICAL ARCHIVES) ── */}
          <g id="blade-2" transform="translate(20, 64)">
            <rect x="0" y="0" width="100" height="28" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            
            {/* 6x High-Speed Drive Caddies */}
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const xPos = 6 + idx * 15;
              return (
                <g key={idx} transform={`translate(${xPos}, 4)`}>
                  <rect x="0" y="0" width="12" height="20" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
                  <rect x="2" y="3" width="8" height="2" rx="0.5" fill="#475569" />
                  <line x1="2" y1="8" x2="10" y2="8" stroke="#0f172a" strokeWidth="1" />
                  
                  {/* Activity LED */}
                  <motion.circle 
                    cx="6" 
                    cy="14" 
                    r="1.2" 
                    fill={idx % 2 === 0 ? '#10b981' : '#38bdf8'} 
                    animate={isProcessing ? { opacity: [0.2, 1, 0.2] } : { opacity: 0.8 }}
                    transition={{ repeat: Infinity, duration: 0.3 + idx * 0.1 }}
                  />
                </g>
              );
            })}
          </g>

          {/* ── 3. BOTTOM BLADE TRAY: LIQUID COOLING RESERVOIR & BUS ── */}
          <g id="blade-3" transform="translate(20, 98)">
            <rect x="0" y="0" width="100" height="32" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />

            {/* Glowing Liquid Pipe Tube */}
            <rect x="8" y="8" width="84" height="16" rx="8" fill="#020617" stroke="#475569" strokeWidth="1" />
            <rect x="10" y="10" width="80" height="12" rx="6" fill="url(#coolantLiquid)" opacity="0.85" filter="url(#neonBlur)" />

            {/* Floating coolant bubbles */}
            <motion.circle 
              cx="22" 
              cy="16" 
              r="2" 
              fill="#ffffff" 
              opacity="0.8" 
              animate={{ x: [0, 40, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
            <motion.circle 
              cx="55" 
              cy="16" 
              r="1.5" 
              fill="#ffffff" 
              opacity="0.9" 
              animate={{ x: [0, -30, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            />
          </g>

          {/* ── 4. VAULT TELEMETRY & METRIC COUNTER ── */}
          <g id="metric-pod" transform="translate(20, 136)">
            <rect x="0" y="0" width="100" height="20" rx="6" fill="#090d16" stroke="#7c3aed" strokeWidth="1.2" />
            <g filter="url(#neonBlur)">
              <text x="50" y="13" fill="#e9d5ff" fontSize="5.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                {recordCount ? `+${recordCount.toLocaleString('tr-TR')} DB ROWS` : '1.48M ROWS INDEXED'}
              </text>
            </g>
          </g>

          {/* ── Tempered Glass Door Highlight (Pixar Curved Reflection) ── */}
          <path
            d="M 16 18 Q 70 24 124 18 L 124 158 Q 70 152 16 158 Z"
            fill="url(#glassDoor)"
            pointerEvents="none"
          />

          {/* Glossy Curved Glare */}
          <path
            d="M 22 22 Q 40 50 28 145"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.45"
            pointerEvents="none"
          />

          {/* Right Handle / Latch */}
          <rect x="122" y="70" width="3" height="24" rx="1.5" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
        </g>
      </svg>
    </div>
  );
});

PixarServerRack.displayName = 'PixarServerRack';
