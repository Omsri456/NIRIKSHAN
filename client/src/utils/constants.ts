import { RiskLevel, UserRole } from '@nirikshan/shared';

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.MINISTRY]: 'Ministry',
  [UserRole.STATE_AUTHORITY]: 'State Authority',
  [UserRole.DISTRICT_AUTHORITY]: 'District Authority',
  [UserRole.MP]: 'Member of Parliament',
  [UserRole.ADMIN]: 'Administrator',
};

/** What a role sees in the dashboard title / scope descriptor. */
export function scopeDescriptor(role: UserRole, scope: { state: string | null; district: string | null; constituency: string | null }): string {
  if (role === UserRole.MINISTRY || role === UserRole.ADMIN) return 'National overview';
  const parts = [scope.constituency, scope.district, scope.state].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'National overview';
}

export const RISK_LEVEL_ORDER: RiskLevel[] = [
  RiskLevel.LOW,
  RiskLevel.MEDIUM,
  RiskLevel.HIGH,
  RiskLevel.CRITICAL,
];

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'var(--risk-low)',
  [RiskLevel.MEDIUM]: 'var(--risk-medium)',
  [RiskLevel.HIGH]: 'var(--risk-high)',
  [RiskLevel.CRITICAL]: 'var(--risk-critical)',
};

export const WORK_STATUS_OPTIONS = [
  'RECOMMENDED',
  'SANCTIONED',
  'IN_PROGRESS',
  'COMPLETED',
  'DROPPED',
];

export const INVESTIGATION_STATUS_OPTIONS = [
  'OPEN',
  'UNDER_REVIEW',
  'PENDING_VERIFICATION',
  'RESOLVED',
  'DISMISSED',
];
