import type { RiskLevel, SignalSeverity, InvestigationPriority, WorkStatus } from '@nirikshan/shared';
import { humanize } from '@/utils/format';

export function RiskBadge({ level }: { level: RiskLevel | SignalSeverity | InvestigationPriority | string }) {
  const norm = level.toLowerCase();
  const label = level.charAt(0) + level.slice(1).toLowerCase();

  return (
    <span className={`gov-risk-badge ${norm}`}>
      <span className="gov-risk-badge-dot" />
      <span>{label}</span>
    </span>
  );
}

export function StatusPill({ status }: { status: WorkStatus | string }) {
  const norm = status.toLowerCase().replace(/_/g, '-');
  return (
    <span className={`status-pill ${norm}`}>
      {humanize(status)}
    </span>
  );
}
