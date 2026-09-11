import { EarlyWarningAlertModel } from '../models/EarlyWarningAlert';
import { WorkModel } from '../models/Work';
import { AppError } from '../utils';

const LEVEL_RANK: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export interface RiskSnapshot {
  score: number;
  level: string;
}

export interface EscalationResult {
  isEscalation: boolean;
  triggerType?: 'LEVEL_ESCALATION' | 'RAPID_SCORE_INCREASE';
  scoreDelta: number;
}

export interface EarlyWarningsQuery {
  page?: number;
  limit?: number;
}

/**
 * Pure function to detect risk escalation or rapid score increase.
 * Triggers on:
 * 1. Any risk-level increase (e.g. LOW -> MEDIUM, MEDIUM -> HIGH)
 * 2. Same-band score jump >= 15 points
 */
export function detectEscalation(previous: RiskSnapshot, next: RiskSnapshot): EscalationResult {
  const prevRank = LEVEL_RANK[previous.level] ?? 0;
  const nextRank = LEVEL_RANK[next.level] ?? 0;
  const scoreDelta = next.score - previous.score;

  if (nextRank > prevRank) {
    return {
      isEscalation: true,
      triggerType: 'LEVEL_ESCALATION',
      scoreDelta,
    };
  }

  if (nextRank === prevRank && scoreDelta >= 15) {
    return {
      isEscalation: true,
      triggerType: 'RAPID_SCORE_INCREASE',
      scoreDelta,
    };
  }

  return {
    isEscalation: false,
    scoreDelta,
  };
}

/**
 * Evaluates escalation between previous and next risk assessments.
 * Swallows errors to ensure ML import and scoring pipeline never fail.
 */
export async function evaluateAndRecordEscalation(
  previous: { score: number; level: string } | null | undefined,
  next: { workId: string; score: number; level: string; modelVersion: string }
): Promise<void> {
  try {
    if (!previous || typeof previous.score !== 'number' || !previous.level) {
      return;
    }

    const result = detectEscalation(previous, next);
    if (result.isEscalation && result.triggerType) {
      await EarlyWarningAlertModel.create({
        workId: next.workId,
        triggerType: result.triggerType,
        previousScore: previous.score,
        newScore: next.score,
        previousLevel: previous.level,
        newLevel: next.level,
        scoreDelta: result.scoreDelta,
        status: 'UNSEEN',
        modelVersion: next.modelVersion,
        triggeredAt: new Date(),
      });
    }
  } catch (err: any) {
    // Intentionally swallow errors so host process never crashes
    console.error(`[AlertEngine] Failed to evaluate escalation for work ${next.workId}:`, err);
  }
}

/**
 * GET early warnings with pagination and geographic scoping,
 * matching risk.service.ts#getHighRisk pattern.
 */
export async function getEarlyWarnings(
  query: EarlyWarningsQuery = {},
  scopeFilter: Record<string, unknown> = {}
) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  const filter: Record<string, unknown> = {};

  if (Object.keys(scopeFilter).length > 0) {
    const works = await WorkModel.find(scopeFilter).select('workId').lean();
    const workIds = works.map((w) => w.workId);
    filter.workId = { $in: workIds };
  }

  const [data, total] = await Promise.all([
    EarlyWarningAlertModel.find(filter)
      .sort({ triggeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EarlyWarningAlertModel.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Acknowledge an early warning alert by ID.
 */
export async function acknowledgeEarlyWarning(id: string) {
  const alert = await EarlyWarningAlertModel.findByIdAndUpdate(
    id,
    { $set: { status: 'ACKNOWLEDGED' } },
    { new: true }
  ).lean();

  if (!alert) {
    throw new AppError(404, 'ALERT_NOT_FOUND', 'Early warning alert not found.');
  }

  return alert;
}
