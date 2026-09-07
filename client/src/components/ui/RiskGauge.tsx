import { RiskLevel } from '@nirikshan/shared';
import { RISK_LEVEL_COLORS } from '@/utils/constants';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel | string;
  size?: number;
}

export function RiskGauge({ score, level, size = 108 }: RiskGaugeProps) {
  const radius = size / 2 - 8;
  const circumference = Math.PI * radius; // half circle
  const clamped = Math.max(0, Math.min(100, score));
  const progress = (clamped / 100) * circumference;
  const color = RISK_LEVEL_COLORS[level as RiskLevel] ?? 'var(--slate-400)';

  return (
    <svg
      width={size}
      height={size / 2 + 12}
      viewBox={`0 0 ${size} ${size / 2 + 12}`}
      role="img"
      aria-label={`Risk score ${Math.round(clamped)}, ${String(level).toLowerCase()} level`}
    >
      <path
        d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke="var(--slate-200)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
      />
      <text
        x={size / 2}
        y={size / 2 - 2}
        textAnchor="middle"
        className="mono"
        style={{ fontSize: 22, fontWeight: 600, fill: 'var(--text-primary)' }}
      >
        {Math.round(clamped)}
      </text>
    </svg>
  );
}
