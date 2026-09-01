/**
 * Risk Engine — Combines ML signals + compliance rules → Risk Score 0–100.
 * TODO: Member 6 — Implement real weighted combination and compliance rules.
 *
 * Architecture (from 06-AI-SPEC.md):
 *   Cost anomaly + Timeline anomaly + Payment anomaly + Similarity + Compliance → Risk Score
 */

interface RiskSignalInput {
  type: string;
  score: number;  // 0.0–1.0
}

interface RiskEngineResult {
  score: number;        // 0–100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: Array<{
    type: string;
    score: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    explanation: string;
    evidence: Record<string, unknown>;
  }>;
  modelVersion: string;
}

// Configurable weights — must be finalized after experimentation
const DEFAULT_WEIGHTS: Record<string, number> = {
  COST_ANOMALY: 0.25,
  TIMELINE_ANOMALY: 0.20,
  PAYMENT_ANOMALY: 0.20,
  SIMILARITY: 0.15,
  COMPLIANCE: 0.15,
  EARLY_WARNING: 0.05,
};

function getSeverity(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.50) return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'LOW';
}

function getLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

export function calculateRiskScore(
  signals: RiskSignalInput[],
  weights: Record<string, number> = DEFAULT_WEIGHTS
): RiskEngineResult {
  let weightedSum = 0;
  let totalWeight = 0;

  const enrichedSignals = signals.map((signal) => {
    const weight = weights[signal.type] ?? 0.1;
    weightedSum += signal.score * weight;
    totalWeight += weight;

    return {
      type: signal.type,
      score: signal.score,
      severity: getSeverity(signal.score),
      explanation: `${signal.type} signal detected with score ${(signal.score * 100).toFixed(0)}%.`,
      evidence: {},
    };
  });

  const normalizedScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  const clampedScore = Math.min(100, Math.max(0, normalizedScore));

  return {
    score: clampedScore,
    level: getLevel(clampedScore),
    signals: enrichedSignals,
    modelVersion: 'risk-engine-v1',
  };
}
