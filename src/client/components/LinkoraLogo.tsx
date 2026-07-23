import { useId } from 'react';

interface LinkoraLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  wordmarkSize?: number | string;
}

export function LinkoraLogo({
  size = 36,
  showWordmark = false,
  wordmarkColor = '#fff',
  wordmarkSize = '1rem',
}: LinkoraLogoProps) {
  const uid = useId();
  const gradId = `${uid}-grad`;
  const glowId = `${uid}-glow`;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      {/* ── Mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Linkora"
        role="img"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10C4A0" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background tile */}
        <rect width="40" height="40" rx="11" fill="#07101C" />
        <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} fillOpacity="0.13" />

        {/* Vertical arm */}
        <line
          x1="14"
          y1="10"
          x2="14"
          y2="27"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Horizontal arm */}
        <line
          x1="14"
          y1="27"
          x2="29"
          y2="27"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Top node */}
        <circle cx="14" cy="10" r="4" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />

        {/* Corner junction */}
        <circle cx="14" cy="27" r="3" fill="#0891B2" opacity="0.85" />

        {/* End node */}
        <circle cx="29" cy="27" r="4" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />

        {/* Secondary arc */}
        <path
          d="M 17 10 Q 29 10 29 23"
          stroke="#10C4A0"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.35"
        />
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <span
          style={{
            color: wordmarkColor,
            fontWeight: 800,
            fontSize: wordmarkSize,
            letterSpacing: '-0.4px',
            lineHeight: 1,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          Linkora
        </span>
      )}
    </span>
  );
}
