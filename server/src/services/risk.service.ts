import { RiskAssessmentModel } from '../models/RiskAssessment';
import { WorkModel } from '../models/Work';

export interface HighRiskQuery {
  page?: number;
  limit?: number;
}

/**
 * GET /api/risk/high-risk – the latest HIGH/CRITICAL risk assessment for
 * each work, sorted by score descending, with pagination, and scoped geographically.
 */
export async function getHighRisk(query: HighRiskQuery, scopeFilter: Record<string, unknown> = {}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const pipeline: any[] = [];

  // Apply geographic scope filtering if provided
  if (Object.keys(scopeFilter).length > 0) {
    const works = await WorkModel.find(scopeFilter).select('workId').lean();
    const workIds = works.map(w => w.workId);
    pipeline.push({ $match: { workId: { $in: workIds } } });
  }

  pipeline.push(
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
    }
  );

  const [result] = await RiskAssessmentModel.aggregate(pipeline);
  const data = result?.data || [];
  const total = result?.total[0]?.count || 0;

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
 * GET /api/risk/alerts – risk-based alerts scoped geographically.
 */
export async function getAlerts(scopeFilter: Record<string, unknown> = {}) {
  const pipeline: any[] = [];

  if (Object.keys(scopeFilter).length > 0) {
    const works = await WorkModel.find(scopeFilter).select('workId').lean();
    const workIds = works.map(w => w.workId);
    pipeline.push({ $match: { workId: { $in: workIds } } });
  }

  pipeline.push(
    { $sort: { generatedAt: -1 } },
    { $group: { _id: '$workId', latest: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$latest' } },
    { $match: { level: { $in: ['HIGH', 'CRITICAL'] } } },
    { $sort: { score: -1 } },
    { $limit: 50 }
  );

  const assessments = await RiskAssessmentModel.aggregate(pipeline);

  const alerts = assessments.map((assessment) => {
    const type = assessment.level === 'CRITICAL' ? 'CRITICAL_RISK' : 'HIGH_RISK';
    const title = assessment.level === 'CRITICAL' ? 'Critical Risk Indicator' : 'High Risk Indicator';
    return {
      id: assessment._id,
      workId: assessment.workId,
      type,
      severity: assessment.level,
      title,
      message: `Work ${assessment.workId} has a risk score of ${assessment.score}, indicating potential anomalies requiring verification.`,
      score: assessment.score,
      generatedAt: assessment.generatedAt,
    };
  });

  return alerts;
}

/**
 * GET /api/risk/signals – signal type distribution scoped geographically.
 */
export async function getSignals(scopeFilter: Record<string, unknown> = {}) {
  const pipeline: any[] = [];

  if (Object.keys(scopeFilter).length > 0) {
    const works = await WorkModel.find(scopeFilter).select('workId').lean();
    const workIds = works.map(w => w.workId);
    pipeline.push({ $match: { workId: { $in: workIds } } });
  }

  pipeline.push(
    { $unwind: '$signals' },
    { $group: { _id: '$signals.type', count: { $sum: 1 } } }
  );

  const result = await RiskAssessmentModel.aggregate(pipeline);
  const signals: Record<string, number> = {};
  
  result.forEach(item => {
    if (item._id) {
      signals[item._id] = item.count;
    }
  });

  return signals;
}