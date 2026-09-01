// ============================================================
// Risk Contracts
// Matches: 04-DATABASE.md → risk_assessments + 06-AI-SPEC.md
// ============================================================

/** Signal types produced by the AI/ML layer */
export enum RiskSignalType {
  COST_ANOMALY = 'COST_ANOMALY',
  TIMELINE_ANOMALY = 'TIMELINE_ANOMALY',
  PAYMENT_ANOMALY = 'PAYMENT_ANOMALY',
  SIMILARITY = 'SIMILARITY',
  COMPLIANCE = 'COMPLIANCE',
  EARLY_WARNING = 'EARLY_WARNING',
}

/** Severity of an individual signal */
export type SignalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** A single explainable risk signal */
export interface RiskSignal {
  type: RiskSignalType;
  score: number;           // 0.0 – 1.0
  severity: SignalSeverity;
  explanation: string;     // Human-readable reason
  evidence: Record<string, unknown>; // Supporting data
}

/** Aggregated risk level thresholds: 0–24 LOW, 25–49 MEDIUM, 50–74 HIGH, 75–100 CRITICAL */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/** A full risk assessment for a work — historical, never overwritten */
export interface RiskAssessment {
  _id: string;
  workId: string;
  score: number;           // 0–100
  level: RiskLevel;
  signals: RiskSignal[];
  modelVersion: string;    // e.g. "risk-engine-v1"
  generatedAt: string;
  createdAt: string;
}

/** Risk alert shown on dashboards */
export interface RiskAlert {
  _id: string;
  workId: string;
  workDescription: string;
  previousLevel: RiskLevel | null;
  currentLevel: RiskLevel;
  score: number;
  topSignals: RiskSignal[];
  generatedAt: string;
  isRead: boolean;
}

/** Helper: derive RiskLevel from a 0–100 score */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return RiskLevel.CRITICAL;
  if (score >= 50) return RiskLevel.HIGH;
  if (score >= 25) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}
