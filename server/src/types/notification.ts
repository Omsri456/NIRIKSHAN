// ============================================================
// Server-side Notification Types
// Mirrors the shared notification contract within server's rootDir.
// ============================================================

export type NotificationType =
  | 'CRITICAL_RISK'
  | 'HIGH_RISK'
  | 'RISK_ESCALATION'
  | 'PROJECT_DELAY'
  | 'FINANCIAL_ANOMALY'
  | 'DATA_QUALITY'
  | 'STATUS_CHANGE';

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  workId: string | null;
  riskScore: number | null;
  timestamp: string;
  targetRoute: string;
  state: string | null;
  district: string | null;
}
