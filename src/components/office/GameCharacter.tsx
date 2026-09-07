import React from 'react';
import { DepartmentType, EventStatus } from '../../services/AppEventBus';

export interface GameCharacterProps {
  department: DepartmentType;
  status: EventStatus;
  className?: string;
  size?: number; // default height in px
}

// Departman Renk Şeması
const DEPT_THEMES: Record<DepartmentType, {
  head: string;
  body: string;
  accent: string;
  glow: string;
  accessory?: string;
}> = {
  BORSA: {
    head: '#3b82f6', // Mavi
    body: '#2563eb',
    accent: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  KAP: {
    head: '#f59e0b', // Turuncu / Amber
    body: '#d97706',
    accent: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  MERKEZ_BANKASI: {
    head: '#10b981', // Yeşil
    body: '#059669',
    accent: '#34d399',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  ARSIV: {
    head: '#94a3b8', // Gri / Arşiv Slate
    body: '#64748b',
    accent: '#cbd5e1',
    glow: 'rgba(148, 163, 184, 0.35)',
  },
  BACKFILL: {
    head: '#a855f7', // Mor / Robot
    body: '#9333ea',
    accent: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  KRIPTO: {
    head: '#f97316', // Turuncu
    body: '#ea580c',
    accent: '#fdba74',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  HALKA_ARZ: {
    head: '#ec4899', // Pembe
    body: '#db2777',
    accent: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.4)',
  },
  HABERLER: {
    head: '#06b6d4', // Cyan
    body: '#0891b2',
    accent: '#22d3ee',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  AMERIKA: {
    head: '#2563eb', // Wall Street Navy/Gold
    body: '#1e3a8a',
    accent: '#fbbf24',
    glow: 'rgba(37, 99, 235, 0.45)',
  },
  ETF_FONLARI: {
    head: '#0d9488', // Teal / Emerald
    body: '#115e59',
    accent: '#2dd4bf',
    glow: 'rgba(13, 148, 136, 0.45)',
  },
};

export const GameCharacter: React.FC<GameCharacterProps> = React.memo(({
  department,
  status,
  className = '',
  size = 72
}) => {
  const theme = DEPT_THEMES[department] || DEPT_THEMES.BORSA;

  // Duruma göre CSS sınıf belirleme
  const isIdle = status === 'IDLE';
  const isBusy = status === 'BUSY';
  const isSuccess = status === 'SUCCESS';
  const isError = status === 'ERROR';
  const isCooldown = status === 'COOLDOWN';

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ height: size, width: (size * 56) / 72 }}
    >
      {/* BUSY Glow Efekti (Karakterin altında/arkasında pulse eden zemin parıltısı) */}
      {isBusy && (
        <div 
          className="absolute -inset-1 rounded-full pointer-events-none anim-char-floor-glow"
          style={{
            backgroundColor: theme.glow,
            filter: 'blur(8px)',
            zIndex: 0
          }}
        />
      )}

      {/* SVG Karakter Gövdesi (ViewBox: 0 0 56 72) */}
      <svg
        viewBox="0 0 56 72"
        className="w-full h-full relative z-10 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Karakter Ana Grubu */}
        <g 
          id="character-root"
          className={
            isIdle ? 'char-root-idle' :
            isBusy ? 'char-root-busy' :
            isSuccess ? 'char-root-success' :
            isError ? 'char-root-error' :
            isCooldown ? 'char-root-cooldown' : ''
          }
        >
          {/* 1. SOL BACAK (Kalça Transform Origin: 22, 52) */}
          <g id="legLeft" className="char-leg-left" style={{ transformOrigin: '22px 52px' }}>
            <rect 
              x="19" 
              y="52" 
              width="6" 
              height="16" 
              rx="3" 
              fill={theme.body} 
              stroke="#0f172a" 
              strokeWidth="1.2" 
            />
            {/* Ayakkabı Tabanı */}
            <rect x="18" y="65" width="8" height="4" rx="2" fill="#1e293b" />
          </g>

          {/* 2. SAĞ BACAK (Kalça Transform Origin: 34, 52) */}
          <g id="legRight" className="char-leg-right" style={{ transformOrigin: '34px 52px' }}>
            <rect 
              x="31" 
              y="52" 
              width="6" 
              height="16" 
              rx="3" 
              fill={theme.body} 
              stroke="#0f172a" 
              strokeWidth="1.2" 
            />
            {/* Ayakkabı Tabanı */}
            <rect x="30" y="65" width="8" height="4" rx="2" fill="#1e293b" />
          </g>

          {/* 3. GÖVDE (Yuvarlatılmış Dikdörtgen - Transform Origin: 28, 40) */}
          <g 
            id="body" 
            className={
              isIdle ? 'char-body-idle' :
              isBusy ? 'char-body-busy' :
              isSuccess ? 'char-body-success' :
              isError ? 'char-body-error' :
              isCooldown ? 'char-body-cooldown' : ''
            }
            style={{ transformOrigin: '28px 40px' }}
          >
            {/* Gövde Ana Dikdörtgen */}
            <rect 
              x="16" 
              y="28" 
              width="24" 
              height="26" 
              rx="5" 
              fill={theme.body} 
              stroke="#0f172a" 
              strokeWidth="1.5" 
            />
            
            {/* Göğüs/Kıyafet Ayracı Vokal Çizgisi */}
            <path 
              d="M 28 28 L 28 42 M 22 34 L 28 40 L 34 34" 
              stroke={theme.accent} 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              opacity="0.8" 
            />

            {/* Departman Özel İkon Rozeti (TCMB Kravat, Robot Çip, vb.) */}
            {department === 'MERKEZ_BANKASI' && (
              <path d="M 27 34 L 29 34 L 30 42 L 28 45 L 26 42 Z" fill="#047857" stroke="#064e3b" strokeWidth="0.8" />
            )}
            {department === 'BACKFILL' && (
              <rect x="23" y="36" width="10" height="6" rx="1.5" fill="#3b0764" stroke="#c084fc" strokeWidth="0.8" />
            )}
          </g>

          {/* 4. SOL KOL (Omuz Transform Origin: 16, 32) */}
          <g 
            id="armLeft" 
            className={
              isIdle ? 'char-arm-left-idle' :
              isBusy ? 'char-arm-left-busy' :
              isSuccess ? 'char-arm-left-success' :
              isError ? 'char-arm-left-error' :
              isCooldown ? 'char-arm-left-cooldown' : ''
            }
            style={{ transformOrigin: '16px 32px' }}
          >
            <rect 
              x="10" 
              y="30" 
              width="6" 
              height="18" 
              rx="3" 
              fill={theme.body} 
              stroke="#0f172a" 
              strokeWidth="1.2" 
            />
            {/* El (Yuvarlak Avuç) */}
            <circle cx="13" cy="48" r="3" fill={theme.accent} stroke="#0f172a" strokeWidth="1" />
          </g>

          {/* 5. SAĞ KOL (Omuz Transform Origin: 40, 32) */}
          <g 
            id="armRight" 
            className={
              isIdle ? 'char-arm-right-idle' :
              isBusy ? 'char-arm-right-busy' :
              isSuccess ? 'char-arm-right-success' :
              isError ? 'char-arm-right-error' :
              isCooldown ? 'char-arm-right-cooldown' : ''
            }
            style={{ transformOrigin: '40px 32px' }}
          >
            <rect 
              x="40" 
              y="30" 
              width="6" 
              height="18" 
              rx="3" 
              fill={theme.body} 
              stroke="#0f172a" 
              strokeWidth="1.2" 
            />
            {/* El (Yuvarlak Avuç) */}
            <circle cx="43" cy="48" r="3" fill={theme.accent} stroke="#0f172a" strokeWidth="1" />

            {/* COOLDOWN DURUMUNDA KAHVE FİNCANI (Elin ucunda) */}
            {isCooldown && (
              <g id="coffeeCup" transform="translate(42, 40)">
                <rect x="0" y="0" width="8" height="9" rx="2" fill="#f8fafc" stroke="#475569" strokeWidth="1" />
                <path d="M 8 2 C 10 2 10 7 8 7" stroke="#475569" strokeWidth="1" fill="none" />
                {/* Kahve Buharı */}
                <path d="M 2 -2 C 2 -4 4 -4 4 -6" stroke="#94a3b8" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 6 -1 C 6 -3 8 -3 8 -5" stroke="#94a3b8" strokeWidth="0.8" strokeLinecap="round" />
              </g>
            )}
          </g>

          {/* 6. KAFA (Daire - Transform Origin: 28, 16) */}
          <g 
            id="head" 
            className={
              isIdle ? 'char-head-idle' :
              isBusy ? 'char-head-busy' :
              isSuccess ? 'char-head-success' :
              isError ? 'char-head-error' :
              isCooldown ? 'char-head-cooldown' : ''
            }
            style={{ transformOrigin: '28px 16px' }}
          >
            {/* Kafa Dairesi */}
            <circle 
              cx="28" 
              cy="16" 
              r="12" 
              fill={theme.head} 
              stroke="#0f172a" 
              strokeWidth="1.5" 
            />

            {/* Gözler (2 Küçük Siyah Nokta) */}
            <circle cx="24" cy="15" r="1.8" fill="#0f172a" />
            <circle cx="32" cy="15" r="1.8" fill="#0f172a" />
            {/* Göz Parıltısı */}
            <circle cx="23.5" cy="14.5" r="0.6" fill="#ffffff" />
            <circle cx="31.5" cy="14.5" r="0.6" fill="#ffffff" />

            {/* Yüz Ağız Çizgisi */}
            {isSuccess ? (
              /* Gülümseme */
              <path d="M 24 19 Q 28 23 32 19" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            ) : isError ? (
              /* Üzüntü / Düz çizgi */
              <path d="M 24 21 Q 28 18 32 21" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            ) : isBusy ? (
              /* Odaklanmış Ağız */
              <circle cx="28" cy="20" r="1.2" fill="#0f172a" />
            ) : (
              /* Normal Düz Ağız */
              <path d="M 25 19 L 31 19" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
            )}

            {/* Kulaklık / Aksesuar (KAP & Borsa için kulaklık, TCMB için gözlük) */}
            {department === 'BORSA' && (
              <path d="M 16 16 C 16 6 40 6 40 16" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
            )}
            {department === 'HALKA_ARZ' && (
              /* Long Hair Back / Bun */
              <g>
                <circle cx="28" cy="5" r="4" fill="#0f172a" />
                <path d="M 16 16 Q 16 26 22 28 Q 18 20 16 16" fill="#0f172a" />
                <path d="M 40 16 Q 40 26 34 28 Q 38 20 40 16" fill="#0f172a" />
              </g>
            )}
            {department === 'HABERLER' && (
              /* Short Bob Hair */
              <g>
                <path d="M 16 16 C 16 2 40 2 40 16 Q 40 22 36 24 Q 38 18 36 12 Q 28 8 20 12 Q 18 18 20 24 Q 16 22 16 16 Z" fill="#0f172a" />
                <path d="M 22 15 L 26 15" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" />
                <path d="M 30 15 L 34 15" stroke="#1e293b" strokeWidth="1" strokeLinecap="round" />
              </g>
            )}
            {department === 'MERKEZ_BANKASI' && (
              <g stroke="#1e293b" strokeWidth="1" fill="none">
                <circle cx="24" cy="15" r="3" />
                <circle cx="32" cy="15" r="3" />
                <line x1="27" y1="15" x2="29" y2="15" />
              </g>
            )}
            {department === 'BACKFILL' && (
              /* Robot Anteni */
              <g>
                <line x1="28" y1="4" x2="28" y2="0" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx="28" cy="0" r="2" fill="#c084fc" />
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
});
