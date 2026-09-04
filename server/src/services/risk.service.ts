import { RiskAssessmentModel } from '../models/RiskAssessment';

export interface HighRiskQuery {
  page?: number;
  limit?: number;
}

/**
 * GET /api/risk/high-risk — the latest HIGH/CRITICAL risk assessment for
 * each work, sorted by score descending, with pagination.
 */
export async function getHighRisk(query: HighRiskQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const pipeline: any[] = [
    { $sort: { generatedAt: -1 } },
    { $group: { _id: '$workId', latest: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$latest' } },
    { $match: { level: { $in: ['HIGH', 'CRITICAL'] } } },
    { $sort: { score: -1 } },
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await RiskAssessmentModel.aggregate(pipeline);
  const data = result.data || [];
  const total = result.total[0]?.count || 0;

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
 * GET /api/risk/alerts — risk-based alerts.
 * Stub returning an empty array; alert generation is a later milestone.
 */
export async function getAlerts() {
  // TODO: Member 6 — Implement alert generation when risk changes
  return [];
}

/**
 * GET /api/risk/signals — signal type distribution.
 * Stub returning the existing mock summary; aggregation is a later milestone.
 */
export function getSignals() {
  // TODO: Member 6 — Aggregate signal type distribution
  return {
    COST_ANOMALY: 420,
    TIMELINE_ANOMALY: 380,
    PAYMENT_ANOMALY: 210,
    SIMILARITY: 95,
    COMPLIANCE: 340,
    EARLY_WARNING: 155,
  };
}