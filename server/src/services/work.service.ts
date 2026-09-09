import { WorkModel } from '../models/Work';
import { ExpenditureModel } from '../models/Expenditure';
import { RiskAssessmentModel } from '../models/RiskAssessment';
import { AppError, buildSortObject, escapeRegex } from '../utils';
import { getSimilarWorks as mlGetSimilar, getAnomalyScores } from './mlClient';

/**
 * Query params accepted by the works list endpoint after validation.
 * `page`/`limit` are normalised to integers by the validation middleware.
 */
export interface WorkListQuery {
  page?: number;
  limit?: number;
  state?: string;
  district?: string;
  constituency?: string;
  status?: string;
  search?: string;
  sort?: string;
}

/**
 * GET /api/works — paginated, filtered, sorted work list.
 */
export async function listWorks(query: WorkListQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const filter: Record<string, unknown> = {};
  if (query.state) filter['location.state'] = query.state;
  if (query.district) filter['location.district'] = query.district;
  if (query.constituency) filter['location.constituency'] = query.constituency;
  if (query.status) filter['execution.status'] = query.status;
  // Search input is escaped so user-provided regex metacharacters cannot
  // create an unsafe or unbounded pattern.
  if (query.search) filter['description'] = { $regex: escapeRegex(query.search), $options: 'i' };

  const sortObj = buildSortObject(query.sort);

  const [works, total] = await Promise.all([
    WorkModel.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit).lean(),
    WorkModel.countDocuments(filter),
  ]);

  return {
    works,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * GET /api/works/:workId — fetch a single work by business identifier.
 */
export async function getWork(workId: string) {
  const work = await WorkModel.findOne({ workId }).lean();
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }
  return work;
}

/**
 * GET /api/works/:workId/expenditures — expenditure records for a work.
 */
export async function getExpenditures(workId: string) {
  return ExpenditureModel.find({ workId }).sort({ date: -1 }).lean();
}

/**
 * GET /api/works/:workId/risk — latest risk assessment for a work.
 * Returns `null` when no assessment exists (existing API behavior).
 */
export async function getLatestRisk(workId: string) {
  return RiskAssessmentModel.findOne({ workId }).sort({ generatedAt: -1 }).lean();
}

/**
 * GET /api/works/:workId/risk-history — historical assessments (newest first).
 */
export async function getRiskHistory(workId: string) {
  return RiskAssessmentModel.find({ workId }).sort({ generatedAt: -1 }).lean();
}

/**
 * GET /api/works/:workId/similar — similar works via ML similarity service.
 *
 * Flow:
 *  1. Validate workId and find the work
 *  2. Call the internal ML similarity service via mlClient
 *  3. Handle ML service failure gracefully (return empty array)
 *  4. Return the list of potentially similar works
 *
 * Does NOT implement similarity algorithms in Node — delegates to ML service.
 */
export async function getSimilarWorks(workId: string): Promise<Array<{ workId: string; description: string; score: number }>> {
  // 1. Find the work to extract similarity input fields
  const work = await WorkModel.findOne({ workId }).lean();
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }

  try {
    // 2. Call ML similarity service
    const mlResponse = await mlGetSimilar({
      workId: work.workId,
      description: work.description,
      category: work.category,
      state: work.location.state,
      district: work.location.district,
    });

    // 3. Handle ML service failure gracefully
    if (!mlResponse.success || !mlResponse.data?.matches) {
      // ML service unavailable or returned error — return empty
      return [];
    }

    // 4. Return matches (potentially similar works, not "duplicates")
    return mlResponse.data.matches;
  } catch {
    // ML service unreachable — graceful degradation
    return [];
  }
}

/**
 * POST /api/works/:workId/analyze-risk
 * Explicit on-demand risk analysis calling ML getAnomalyScores and persisting updated RiskAssessment to MongoDB.
 */
export async function analyzeWorkRisk(workId: string) {
  const work = await WorkModel.findOne({ workId }).lean();
  if (!work) {
    throw new AppError(404, 'WORK_NOT_FOUND', 'Work could not be found.');
  }

  const recDate = work.recommendation?.date ? new Date(work.recommendation.date) : new Date();
  const compDate = work.execution?.completionDate ? new Date(work.execution.completionDate) : null;
  const durationDays = compDate
    ? Math.max(1, Math.round((compDate.getTime() - recDate.getTime()) / (1000 * 3600 * 24)))
    : Math.max(1, Math.round((Date.now() - recDate.getTime()) / (1000 * 3600 * 24)));

  const features: Record<string, number> = {
    recommendedAmount: work.recommendation?.amount || 0,
    finalAmount: work.financial?.finalAmount || 0,
    totalExpenditure: work.financial?.totalExpenditure || 0,
    durationDays,
    daysSinceRecommendation: durationDays,
  };

  const mlRes = await getAnomalyScores({ workId, features });

  const signals = (mlRes.data?.signals || []).map((s) => ({
    type: s.type,
    score: s.score,
    severity: s.score >= 0.75 ? 'HIGH' : s.score >= 0.5 ? 'MEDIUM' : 'LOW',
    explanation: `${s.type.replace(/_/g, ' ')} detected with score ${(s.score * 100).toFixed(0)}%`,
    evidence: { workId, features },
  }));

  const avgSignalScore = signals.length > 0
    ? signals.reduce((acc, curr) => acc + curr.score, 0) / signals.length
    : 0.1;
  const overallScore = Math.min(Math.max(Math.round(avgSignalScore * 100), 0), 100);
  const level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
    overallScore >= 75 ? 'CRITICAL' : overallScore >= 50 ? 'HIGH' : overallScore >= 25 ? 'MEDIUM' : 'LOW';

  const assessment = await RiskAssessmentModel.create({
    workId,
    score: overallScore,
    level,
    signals,
    modelVersion: mlRes.data?.modelVersion || 'nirikshan-ml-realtime',
    generatedAt: new Date(),
  });

  return assessment;
}