import React from 'react';

/**
 * State Emblem of India (Lion Capital of Ashoka with Satyameva Jayate)
 * High-fidelity vector graphic matching the official reference (Attached Image 3)
 */
export function EmblemOfIndia({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src="/emblem_of_india.svg"
      alt="State Emblem of India"
      className={`emblem-of-india ${className}`}
      style={{
        height: '46px',
        width: 'auto',
        maxHeight: '48px',
        display: 'block',
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}


/**
 * High-Detail Architectural Illustration: Parliament of India (Sansad Bhavan)
 * Multi-tiered classical peristyle colonnade, arched porticos, dome drum with ribs,
 * stepped balustrades, flagpole with waving Indian Tricolour flag (omitted on sidebar),
 * and plinth foundation.
 */
export function ParliamentWatermark({
  className = '',
  style = {},
  variant = 'dashboard',
}: {
  className?: string;
  style?: React.CSSProperties;
  variant?: 'sidebar' | 'dashboard' | 'login';
}) {
  const isDashboard = variant === 'dashboard';
  const isSidebar = variant === 'sidebar';

  // Palette hierarchy: primary structure, fine detailing, ambient fill, and flag
  const strokePrimary = isDashboard
    ? 'rgba(15, 118, 110, 0.46)'
    : isSidebar
    ? 'rgba(45, 212, 191, 0.58)'
    : 'rgba(20, 184, 166, 0.45)';

  const strokeDetail = isDashboard
    ? 'rgba(100, 116, 139, 0.32)'
    : isSidebar
    ? 'rgba(20, 184, 166, 0.35)'
    : 'rgba(30, 60, 90, 0.4)';

  const strokeFine = isDashboard
    ? 'rgba(148, 163, 184, 0.25)'
    : isSidebar
    ? 'rgba(20, 184, 166, 0.22)'
    : 'rgba(20, 184, 166, 0.2)';

  const fillDome = isDashboard
    ? 'rgba(240, 253, 250, 0.55)'
    : isSidebar
    ? '#092135'
    : '#0b243b';

  const fillBase = isDashboard
    ? 'rgba(241, 245, 249, 0.4)'
    : isSidebar
    ? '#051624'
    : '#061626';

  const fillPortals = isDashboard
    ? 'rgba(226, 232, 240, 0.6)'
    : isSidebar
    ? '#030e18'
    : '#04101d';

  const accentLine = isDashboard ? 'rgba(20, 184, 166, 0.65)' : '#14b8a6';

  return (
    <svg
      className={`parliament-watermark parliament-${variant} ${className}`}
      style={{
        width: '100%',
        height: 'auto',
        pointerEvents: 'none',
        display: 'block',
        ...style,
      }}
      viewBox="0 0 700 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Parliament of India Architectural Watermark"
    >
      <defs>
        <linearGradient id={`parliament-colonnade-grad-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isDashboard ? '#ffffff' : '#0a2338'} stopOpacity={isDashboard ? '0.8' : '0.9'} />
          <stop offset="100%" stopColor={fillBase} stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* 1. Central Flagpole (only on dashboard / login, clean finial on sidebar) */}
      {!isSidebar ? (
        <>
          <line x1="350" y1="65" x2="350" y2="10" stroke={strokePrimary} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="350" cy="9" r="1.8" fill={strokePrimary} />

          {/* 2. Indian Tricolour Flag atop Central Dome */}
          <g opacity={isDashboard ? 0.85 : 0.9}>
            <path d="M 350,10 Q 365,7 384,12 L 384,18 Q 365,13 350,16 Z" fill="#ff9933" />
            <path d="M 350,16 Q 365,13 384,18 L 384,24 Q 365,19 350,22 Z" fill="#ffffff" />
            <path d="M 350,22 Q 365,19 384,24 L 384,30 Q 365,25 350,28 Z" fill="#138808" />
            {/* Ashoka Chakra */}
            <circle cx="367" cy="20" r="2.2" stroke="#000080" strokeWidth="0.7" fill="none" />
            <circle cx="367" cy="20" r="0.6" fill="#000080" />
          </g>
        </>
      ) : (
        /* Clean architectural finial on dome for sidebar */
        <circle cx="350" cy="56" r="3.2" fill={strokePrimary} />
      )}

      {/* 3. Central Elevated Dome (Lantern Cupola) */}
      <ellipse cx="350" cy="65" rx="14" ry="4" fill={fillDome} stroke={strokePrimary} strokeWidth="1.6" />
      <rect x="344" y="58" width="12" height="7" rx="1" fill={fillDome} stroke={strokePrimary} strokeWidth="1.4" />
      
      {/* Main Dome Shell with Classical Curvature */}
      <path
        d="M 300,118 C 300,68 400,68 400,118 Z"
        fill={fillDome}
        stroke={strokePrimary}
        strokeWidth="2.2"
      />
      {/* Dome Radiating Ribs */}
      <path d="M 320,116 C 322,88 335,72 344,66" stroke={strokeDetail} strokeWidth="1.4" fill="none" />
      <line x1="350" y1="118" x2="350" y2="65" stroke={strokePrimary} strokeWidth="1.6" />
      <path d="M 380,116 C 378,88 365,72 356,66" stroke={strokeDetail} strokeWidth="1.4" fill="none" />
      <path d="M 308,117 C 310,95 320,80 332,70" stroke={strokeFine} strokeWidth="1.1" fill="none" />
      <path d="M 392,117 C 390,95 380,80 368,70" stroke={strokeFine} strokeWidth="1.1" fill="none" />

      {/* 4. Dome Drum Base / Attic with Fenestrations */}
      <path
        d="M 285,138 L 285,118 Q 350,112 415,118 L 415,138 Q 350,132 285,138 Z"
        fill={fillBase}
        stroke={strokePrimary}
        strokeWidth="1.8"
      />
      {/* Drum Miniature Arched Windows */}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = 294 + i * 11;
        return (
          <path
            key={i}
            d={`M ${x},134 V 124 C ${x},121 ${x + 6},121 ${x + 6},124 V 134 Z`}
            fill={fillPortals}
            stroke={strokeDetail}
            strokeWidth="1"
          />
        );
      })}

      {/* 5. Main Circular Balustrade & Cornice Entablature Arc */}
      {/* Upper Cornice Tier */}
      <path
        d="M 30,210 Q 350,125 670,210"
        stroke={strokePrimary}
        strokeWidth="2.4"
        fill="none"
      />
      <path
        d="M 35,218 Q 350,135 665,218"
        stroke={strokeDetail}
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M 30,210 Q 350,125 670,210 L 665,225 Q 350,142 35,225 Z"
        fill={fillBase}
        stroke={strokePrimary}
        strokeWidth="1.8"
      />
      {/* Cornice Dentil Brackets */}
      {Array.from({ length: 48 }).map((_, i) => {
        const x = 46 + i * 12.8;
        const curveOffset = Math.sin((i / 48) * Math.PI) * 78;
        const y = 208 - curveOffset;
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x}
            y2={y + 6}
            stroke={strokeFine}
            strokeWidth="1.2"
          />
        );
      })}

      {/* 6. Recessed Gallery Wall with Classical Arched Doorways / Portals */}
      <path
        d="M 40,225 Q 350,142 660,225 L 660,305 Q 350,230 40,305 Z"
        fill={`url(#parliament-colonnade-grad-${variant})`}
      />

      {/* Repeating Arched Doorways / Gateways behind Colonnade */}
      {Array.from({ length: 17 }).map((_, i) => {
        const x = 65 + i * 35;
        const curveOffset = Math.sin((i / 17) * Math.PI) * 56;
        const topY = 250 - curveOffset;
        const botY = 300 - curveOffset * 0.45;
        return (
          <g key={i}>
            <path
              d={`M ${x},${botY} V ${topY + 8} C ${x},${topY} ${x + 18},${topY} ${x + 18},${topY + 8} V ${botY} Z`}
              fill={fillPortals}
              stroke={strokeDetail}
              strokeWidth="1.4"
            />
            {/* Arched Keystone & Fanlight detail */}
            <path
              d={`M ${x + 3},${topY + 8} Q ${x + 9},${topY + 3} ${x + 15},${topY + 8}`}
              stroke={strokeFine}
              strokeWidth="0.8"
              fill="none"
            />
          </g>
        );
      })}

      {/* 7. Peristyle Colonnade: 49 Slender Classical Pillars across facade */}
      {Array.from({ length: 49 }).map((_, i) => {
        const x = 45 + i * 12.7;
        const curveOffset = Math.sin((i / 49) * Math.PI) * 80;
        const topY = 222 - curveOffset;
        const botY = 302 - curveOffset * 0.45;
        return (
          <g key={i}>
            {/* Column Shaft */}
            <line
              x1={x}
              y1={topY}
              x2={x}
              y2={botY}
              stroke={strokePrimary}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Column Capital */}
            <line
              x1={x - 3.2}
              y1={topY}
              x2={x + 3.2}
              y2={topY}
              stroke={strokePrimary}
              strokeWidth="2.4"
            />
            {/* Column Base Plinth */}
            <line
              x1={x - 3.2}
              y1={botY}
              x2={x + 3.2}
              y2={botY}
              stroke={strokePrimary}
              strokeWidth="2.4"
            />
          </g>
        );
      })}

      {/* 8. Stepped Podium Plinth Foundation Steps */}
      <path
        d="M 25,305 Q 350,230 675,305 L 675,335 Q 350,260 25,335 Z"
        fill={fillBase}
        stroke={strokePrimary}
        strokeWidth="2.2"
      />
      <path
        d="M 15,335 Q 350,260 685,335 L 685,348 Q 350,273 15,348 Z"
        fill={fillBase}
        stroke={strokeDetail}
        strokeWidth="1.8"
      />
      <line x1="8" y1="348" x2="692" y2="348" stroke={accentLine} strokeWidth="2.4" />
    </svg>
  );
}

// Re-exports
export { ParliamentWatermark as ParliamentIllustration };
export { ParliamentWatermark as ParliamentSidebarWatermark };
export { ParliamentWatermark as ParliamentDashboardWatermark };

export { IndiaMonitoringVisualization } from '@/components/map/IndiaMonitoringVisualization';
export { IndiaMonitoringVisualization as IndiaMapTelemetry } from '@/components/map/IndiaMonitoringVisualization';
export { IndiaMonitoringVisualization as IndiaMonitoringMap } from '@/components/map/IndiaMonitoringVisualization';

/**
 * Clean Vector Silhouette of India for Institutional Header Mark
 */
export function IndiaSilhouette({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={{ width: '32px', height: '38px', flexShrink: 0, ...style }}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="India Map Silhouette"
    >
      {/* Accurate Detailed Vector Outline of India */}
      <path
        d="M 45,8 
           C 48,6 52,6 55,8 
           C 57,12 59,15 60,18 
           C 62,17 65,18 66,20 
           C 64,24 62,26 60,28 
           C 65,30 70,32 74,34 
           C 78,35 82,38 86,39 
           C 89,36 93,37 96,38 
           C 97,42 96,46 92,48 
           C 89,50 86,49 84,48 
           C 83,52 80,55 77,57 
           C 77,60 74,64 73,67 
           C 70,69 67,71 64,74 
           C 61,77 59,82 56,87 
           C 53,92 50,100 48,107 
           C 47,112 45,112 44,107 
           C 41,100 38,92 35,85 
           C 32,77 29,70 26,63 
           C 23,57 20,52 18,46 
           C 16,40 18,36 21,32 
           C 24,28 27,25 29,20 
           C 31,14 34,9 37,3 Z"
        fill="#cbd5e1"
        stroke="#94a3b8"
        strokeWidth="0.8"
        opacity="0.65"
      />
      {/* Subtle Internal Telemetry Mesh Overlay */}
      <g stroke="rgba(15, 118, 110, 0.3)" strokeWidth="0.5" strokeDasharray="1.5 1.5">
        <line x1="38" y1="36" x2="65" y2="48" />
        <line x1="50" y1="20" x2="48" y2="85" />
        <line x1="30" y1="65" x2="68" y2="70" />
      </g>
    </svg>
  );
}

/**
 * Top Header Institutional Brand Mark: India Silhouette + Indian Flag + Typography
 * Matches Reference Image Top Header
 */
export function IndiaTransparencyMark({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`india-transparency-mark ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Detailed India Silhouette with Delicate Network Mesh & Miniature Indian Flag */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IndiaSilhouette />
        {/* Miniature Waving Indian Tricolor Flag with Flagpole */}
        <div
          style={{
            position: 'absolute',
            top: '0px',
            right: '-7px',
            display: 'flex',
            flexDirection: 'column',
            width: '18px',
            height: '12px',
            borderRadius: '1.5px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
            border: '0.6px solid rgba(0,0,0,0.12)',
          }}
          aria-label="Indian Tricolour"
        >
          <div style={{ flex: 1, backgroundColor: '#ff9933' }} />
          <div
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '3.5px',
                height: '3.5px',
                borderRadius: '50%',
                border: '0.6px solid #000080',
              }}
            />
          </div>
          <div style={{ flex: 1, backgroundColor: '#138808' }} />
        </div>
      </div>

      {/* Clean Vertical Divider Bar */}
      <div
        style={{
          width: '1px',
          height: '30px',
          backgroundColor: '#cbd5e1',
        }}
      />

      {/* Institutional 3-line Typography + Teal Underline Bar */}
      <div>
        <div
          style={{
            fontSize: '9.5px',
            fontWeight: 700,
            letterSpacing: '0.09em',
            color: '#64748b',
            lineHeight: 1.25,
            textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          DATA<br />
          FOR A MORE<br />
          TRANSPARENT INDIA
        </div>
        <div
          style={{
            width: '24px',
            height: '2px',
            backgroundColor: '#0f766e',
            borderRadius: '1px',
            marginTop: '3px',
          }}
        />
      </div>
    </div>
  );
}

/**
 * NIRIKSHAN Sidebar Brand Wordmark with Premium Masked Traveling Light Reflection
 */
export function SidebarBrandLogo({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`sidebar-shining-brand-wrap ${className}`} style={{ position: 'relative', ...style }}>
      <svg
        className="sidebar-shining-brand-svg"
        viewBox="0 0 170 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '170px', height: '32px', display: 'block' }}
        aria-label="NIRIKSHAN Brand Logo"
      >
        <defs>
          {/* Traveling Soft White Light Sweep Gradient */}
          <linearGradient id="traveling-shine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Mask clipped to exact NIRIKSHAN Letterforms */}
          <mask id="sidebar-nirikshan-text-mask">
            <text
              x="0"
              y="24"
              fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              fontSize="24"
              fontWeight="800"
              letterSpacing="0.06em"
              fill="#ffffff"
            >
              NIRIKSHAN
            </text>
          </mask>
        </defs>

        {/* 1. Base Layer: Normal NIRIKSHAN Wordmark */}
        <g className="sidebar-brand-base-text">
          <text
            x="0"
            y="24"
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fontSize="24"
            fontWeight="800"
            letterSpacing="0.06em"
          >
            <tspan fill="#ffffff">NIRIK</tspan>
            <tspan fill="#14b8a6">SHAN</tspan>
          </text>
        </g>

        {/* 2. Highlight Layer: Masked White Reflection traveling Left -> Right */}
        <g mask="url(#sidebar-nirikshan-text-mask)" className="sidebar-brand-shine-layer">
          <rect
            className="sidebar-brand-shine-rect"
            x="-120"
            y="0"
            width="90"
            height="32"
            fill="url(#traveling-shine-grad)"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * NIRIKSHAN Hero Brand Wordmark for Login/Register Pages
 * Typewriter reveal with active cursor bar ▌, blinking pause, traveling white shine,
 * reverse backspacing deletion (Right -> Left), and immediate loop.
 */
export function LoginHeroBrandLogo({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  const [charCount, setCharCount] = React.useState(1);
  const [phase, setPhase] = React.useState<'TYPING' | 'BLINK' | 'SHINE' | 'BACKSPACING' | 'PAUSE'>('TYPING');

  const FULL_WORD = 'NIRIKSHAN';

  React.useEffect(() => {
    // Check reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCharCount(FULL_WORD.length);
      setPhase('SHINE');
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'TYPING') {
      // Smooth left -> right reveal: ~1.5s total (~165ms per character)
      if (charCount < FULL_WORD.length) {
        timer = setTimeout(() => {
          setCharCount((prev) => prev + 1);
        }, 165);
      } else {
        timer = setTimeout(() => {
          setPhase('BLINK');
        }, 100);
      }
    } else if (phase === 'BLINK') {
      // Brief blinking cursor at the end of reveal: ~0.5s
      timer = setTimeout(() => {
        setPhase('SHINE');
      }, 500);
    } else if (phase === 'SHINE') {
      // Fully visible for approximately 10 seconds with periodic white/cyan shine sweeps
      timer = setTimeout(() => {
        setPhase('BACKSPACING');
      }, 10000);
    } else if (phase === 'BACKSPACING') {
      // Smoothly vanish right -> left: ~1.5s total (~165ms per character)
      if (charCount > 0) {
        timer = setTimeout(() => {
          setCharCount((prev) => prev - 1);
        }, 165);
      } else {
        timer = setTimeout(() => {
          setPhase('PAUSE');
        }, 60);
      }
    } else if (phase === 'PAUSE') {
      // Immediately begin the next reveal cycle (no long empty wait)
      timer = setTimeout(() => {
        setCharCount(1);
        setPhase('TYPING');
      }, 50);
    }

    return () => clearTimeout(timer);
  }, [charCount, phase]);

  const displayed = FULL_WORD.slice(0, charCount);
  const nirikPart = displayed.slice(0, 5);
  const shanPart = displayed.slice(5, 9);
  const showCursor = phase === 'TYPING' || phase === 'BLINK' || phase === 'BACKSPACING';
  const isShining = phase === 'SHINE';

  return (
    <div
      className={`brand-typewriter-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '56px',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 1. Base Typewritten Letters */}
      <span
        className="brand-typewriter-text"
        style={{
          fontSize: '52px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          lineHeight: 1,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}
      >
        <span style={{ color: '#ffffff' }}>{nirikPart}</span>
        <span style={{ color: '#14b8a6' }}>{shanPart}</span>
      </span>

      {/* 2. Active Terminal Cursor Bar ▌ */}
      {showCursor && (
        <span
          className="brand-typewriter-cursor"
          style={{
            display: 'inline-block',
            width: '4px',
            height: '42px',
            backgroundColor: '#14b8a6',
            marginLeft: '4px',
            borderRadius: '1.5px',
            boxShadow: '0 0 10px rgba(20, 184, 166, 0.85)',
          }}
        />
      )}

      {/* 3. Masked Traveling White Light Shine Layer (active during full NIRIKSHAN display) */}
      {isShining && (
        <div
          className="brand-typewriter-shine-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
          }}
        >
          <svg
            viewBox="0 0 370 60"
            style={{ width: '370px', height: '60px', display: 'block' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="typewriter-shine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="25%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="42%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="55%" stopColor="#2dd4bf" stopOpacity="0.75" />
                <stop offset="60%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="78%" stopColor="#ffffff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <mask id="typewriter-shine-mask">
                <text
                  x="0"
                  y="48"
                  fontFamily="'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                  fontSize="52"
                  fontWeight="800"
                  letterSpacing="0.04em"
                  fill="#ffffff"
                >
                  NIRIKSHAN
                </text>
              </mask>
            </defs>
            <g mask="url(#typewriter-shine-mask)">
              <rect
                className="brand-typewriter-shine-rect"
                x="-200"
                y="0"
                width="180"
                height="60"
                fill="url(#typewriter-shine-grad)"
              />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}




/**
 * NIRIKSHAN Eye / Iris Brand Icon
 */
export function NirikshanEyeIcon({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={{ width: '48px', height: '48px', ...style }}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="eye-outer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="eye-iris-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <path
        d="M4 32C12 18 24 12 32 12C40 12 52 18 60 32C52 46 40 52 32 52C24 52 12 46 4 32Z"
        stroke="url(#eye-outer-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="32" cy="32" r="11" stroke="url(#eye-iris-grad)" strokeWidth="3" fill="none" />
      <circle cx="32" cy="32" r="5" fill="#0f766e" />
      <circle cx="34" cy="30" r="1.5" fill="#ffffff" />
    </svg>
  );
}
