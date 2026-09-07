import { RiskLevel } from '@nirikshan/shared';
import { humanize } from '@/utils/format';

const LEVEL_CLASS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'badge-low',
  [RiskLevel.MEDIUM]: 'badge-medium',
  [RiskLevel.HIGH]: 'badge-high',
  [RiskLevel.CRITICAL]: 'badge-critical',
};

export function RiskBadge({ level }: { level: RiskLevel | string }) {
  const className = LEVEL_CLASS[level as RiskLevel] ?? 'badge-neutral';
  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot" style={{ background: 'currentColor' }} />
      {humanize(level)}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className="status-pill">{humanize(status)}</span>;
}
