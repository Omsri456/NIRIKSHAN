// ============================================================
// Notification Contracts — Role-Based Alert System
// Isolated from existing business logic types.
// ============================================================

/** The category of alert that was triggered */
export type NotificationType =
  | 'CRITICAL_RISK'
  | 'HIGH_RISK'
  | 'RISK_ESCALATION'
  | 'PROJECT_DELAY'
  | 'FINANCIAL_ANOMALY'
  | 'DATA_QUALITY'
  | 'STATUS_CHANGE';

/** Visual severity used for UI styling */
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * A single notification item returned by GET /api/notifications.
 * Computed on-the-fly from existing data — NOT persisted in a collection.
 */
export interface AppNotification {
  /** Deterministic ID derived from type + workId (stable across requests) */
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** Associated work ID (null for system-level alerts) */
  workId: string | null;
  /** Risk score at time of alert (null when not risk-related) */
  riskScore: number | null;
  /** ISO timestamp of the event */
  timestamp: string;
  /** Frontend route to navigate to when clicked */
  targetRoute: string;
  /** Geographic context for role filtering */
  state: string | null;
  district: string | null;
}
