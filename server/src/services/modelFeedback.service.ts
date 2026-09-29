/**
 * Model Feedback Service — Ground-truth feedback loop.
 *
 * Mines resolved Investigation findings to compute model precision stats.
 * When a District Authority investigates a flagged work and sets a finding
 * (NO_ISSUE vs MAJOR_IRREGULARITY), that IS ground truth that tells us
 * whether the ML model's flag was correct.
 *
 * Provides:
 *   - Overall precision (TP / (TP + FP))
 *   - Precision by risk level
 *   - Trend over time
 *   - Per-signal type accuracy (which signals are most/least reliable)
 */

import { InvestigationModel } from '../models/Investigation';
import { RiskAssessmentModel } from '../models/RiskAssessment';
import { WorkModel } from '../models/Work';

// ── Types ─────────────────────────────────────────────────────────────

interface VerifiedOutcome {
  workId: string;
  finding: string;
  riskScoreAtTime: number;
  riskLevelAtTime: string;
  resolvedAt: Date;
  isIrregularity: boolean;
}

export interface PrecisionStats {
  totalVerified: number;
  truePositives: number;
  falsePositives: number;
  precision: number;
  byRiskLevel: Record<string, { verified: number; truePositive: number; precision: number }>;
  recentTrend: Array<{
    period: string;
    verified: number;
    truePositives: number;
    precision: number;
  }>;
  topSignals: Array<{
    signalType: string;
    occurrences: number;
    confirmedIrregularities: number;
    accuracy: number;
  }>;
}

// ── Main Functions ────────────────────────────────────────────────────

/**
 * Get precision statistics from resolved investigations.
 *
 * True Positive: Investigation finding is MINOR_IRREGULARITY,
 *                MAJOR_IRREGULARITY, or REFERRED_FOR_ACTION
 * False Positive: Investigation finding is NO_ISSUE
 */
export async function getModelPrecisionStats(
  scopeFilter: Record<string, unknown>
): Promise<PrecisionStats> {
  // 1. Get all resolved/dismissed investigations with findings
  let investigationFilter: Record<string, unknown> = {
    status: { $in: ['RESOLVED', 'DISMISSED'] },
    finding: { $ne: null },
  };

  // Apply scope filter through works
  if (Object.keys(scopeFilter).length > 0) {
    const scopedWorks = await WorkModel.find(scopeFilter).distinct('workId');
    investigationFilter.workId = { $in: scopedWorks };
  }

  const investigations = await InvestigationModel.find(investigationFilter)
    .sort({ updatedAt: -1 })
    .lean();

  if (investigations.length === 0) {
    return {
      totalVerified: 0,
      truePositives: 0,
      falsePositives: 0,
      precision: 0,
      byRiskLevel: {},
      recentTrend: [],
      topSignals: [],
    };
  }

  // 2. For each investigation, find the risk assessment closest to when it was opened
  const workIds = investigations.map(inv => inv.workId);

  const latestRisks = await RiskAssessmentModel.aggregate([
    { $match: { workId: { $in: workIds } } },
    { $sort: { generatedAt: -1 } },
    {
      $group: {
        _id: '$workId',
        score: { $first: '$score' },
        level: { $first: '$level' },
        signals: { $first: '$signals' },
      },
    },
  ]);
  const riskMap = new Map(
    latestRisks.map(r => [r._id, { score: r.score, level: r.level, signals: r.signals || [] }])
  );

  // 3. Classify each investigation outcome
  const IRREGULARITY_FINDINGS = new Set([
    'MINOR_IRREGULARITY',
    'MAJOR_IRREGULARITY',
    'REFERRED_FOR_ACTION',
  ]);

  const outcomes: VerifiedOutcome[] = [];

  for (const inv of investigations) {
    const risk = riskMap.get(inv.workId);
    const finding = inv.finding as string;

    outcomes.push({
      workId: inv.workId,
      finding,
      riskScoreAtTime: risk?.score ?? 0,
      riskLevelAtTime: risk?.level ?? 'LOW',
      resolvedAt: (inv as any).updatedAt || new Date(),
      isIrregularity: IRREGULARITY_FINDINGS.has(finding),
    });
  }

  // 4. Compute overall precision
  const totalVerified = outcomes.length;
  const truePositives = outcomes.filter(o => o.isIrregularity).length;
  const falsePositives = totalVerified - truePositives;
  const precision = totalVerified > 0 ? Math.round((truePositives / totalVerified) * 100) : 0;

  // 5. Precision by risk level
  const byRiskLevel: Record<
    string,
    { verified: number; truePositive: number; precision: number }
  > = {};

  for (const level of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
    const levelOutcomes = outcomes.filter(o => o.riskLevelAtTime === level);
    const levelTP = levelOutcomes.filter(o => o.isIrregularity).length;
    byRiskLevel[level] = {
      verified: levelOutcomes.length,
      truePositive: levelTP,
      precision: levelOutcomes.length > 0 ? Math.round((levelTP / levelOutcomes.length) * 100) : 0,
    };
  }

  // 6. Recent trend (by month)
  const monthBuckets = new Map<
    string,
    { verified: number; truePositives: number }
  >();

  for (const o of outcomes) {
    const date = new Date(o.resolvedAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthBuckets.has(month)) {
      monthBuckets.set(month, { verified: 0, truePositives: 0 });
    }
    const bucket = monthBuckets.get(month)!;
    bucket.verified++;
    if (o.isIrregularity) bucket.truePositives++;
  }

  const recentTrend = Array.from(monthBuckets.entries())
    .map(([period, data]) => ({
      period,
      verified: data.verified,
      truePositives: data.truePositives,
      precision: data.verified > 0 ? Math.round((data.truePositives / data.verified) * 100) : 0,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-6);

  // 7. Per-signal accuracy (which ML signals correlate best with real issues)
  const signalStats = new Map<
    string,
    { occurrences: number; confirmed: number }
  >();

  for (const o of outcomes) {
    const risk = riskMap.get(o.workId);
    if (!risk?.signals) continue;

    for (const signal of risk.signals) {
      const type = signal.type || 'UNKNOWN';
      if (!signalStats.has(type)) {
        signalStats.set(type, { occurrences: 0, confirmed: 0 });
      }
      const stat = signalStats.get(type)!;
      stat.occurrences++;
      if (o.isIrregularity) stat.confirmed++;
    }
  }

  const topSignals = Array.from(signalStats.entries())
    .map(([signalType, data]) => ({
      signalType,
      occurrences: data.occurrences,
      confirmedIrregularities: data.confirmed,
      accuracy:
        data.occurrences > 0 ? Math.round((data.confirmed / data.occurrences) * 100) : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  return {
    totalVerified,
    truePositives,
    falsePositives,
    precision,
    byRiskLevel,
    recentTrend,
    topSignals,
  };
}
