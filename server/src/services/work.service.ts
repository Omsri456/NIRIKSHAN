import { WorkModel } from '../models/Work';
import { ExpenditureModel } from '../models/Expenditure';
import { RiskAssessmentModel } from '../models/RiskAssessment';
import { AppError, buildSortObject, escapeRegex } from '../utils';

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
 * GET /api/works/:workId/similar — similar works.
 * Currently returns an empty array pending ML similarity integration
 * (existing API behavior is preserved).
 */
export async function getSimilarWorks(_workId: string) {
  // TODO: Member 5 — Wire to ML similarity service
  return [];
}