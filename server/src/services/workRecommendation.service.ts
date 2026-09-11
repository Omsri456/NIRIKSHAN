import { WorkRecommendationModel } from '../models/WorkRecommendation';
import { AppError } from '../utils';

export interface CreateRecommendationInput {
  description: string;
  category: string;
  estimatedCost: number;
  justification: string;
  constituency: string;
  district: string;
  state: string;
}

export interface RecommendationListQuery {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * POST /api/recommendations — Create a new MP work recommendation.
 */
export async function createRecommendation(body: CreateRecommendationInput, userId: string) {
  return WorkRecommendationModel.create({
    description: body.description,
    category: body.category,
    estimatedCost: body.estimatedCost,
    justification: body.justification,
    constituency: body.constituency,
    district: body.district,
    state: body.state,
    status: 'SUBMITTED',
    recommendedBy: userId,
  });
}

/**
 * GET /api/recommendations — List work recommendations.
 * MPs see ONLY their own recommendations.
 * Authorities/Admin get geographic scope filtering.
 */
export async function listRecommendations(
  query: RecommendationListQuery,
  scopeFilter: Record<string, unknown> = {},
  userRole: string,
  userId: string
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  const filter: Record<string, unknown> = {};

  if (userRole === 'MP') {
    filter.recommendedBy = userId;
  } else {
    const stateVal = scopeFilter['location.state'] ?? scopeFilter.state;
    const distVal = scopeFilter['location.district'] ?? scopeFilter.district;
    const constVal = scopeFilter['location.constituency'] ?? scopeFilter.constituency;

    if (stateVal) filter.state = stateVal;
    if (distVal) filter.district = distVal;
    if (constVal) filter.constituency = constVal;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const [recommendations, total] = await Promise.all([
    WorkRecommendationModel.find(filter)
      .populate('recommendedBy', 'name email role scope')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WorkRecommendationModel.countDocuments(filter),
  ]);

  return {
    recommendations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * PATCH /api/recommendations/:id/status — Update status of a recommendation.
 */
export async function updateRecommendationStatus(id: string, status: string, userRole: string) {
  const allowedRoles = ['DISTRICT_AUTHORITY', 'STATE_AUTHORITY', 'MINISTRY', 'ADMIN'];
  if (!allowedRoles.includes(userRole)) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Only District Authority, State Authority, Ministry, or Admin can update recommendation status.'
    );
  }

  const recommendation = await WorkRecommendationModel.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  )
    .populate('recommendedBy', 'name email role scope')
    .lean();

  if (!recommendation) {
    throw new AppError(404, 'RECOMMENDATION_NOT_FOUND', 'Work recommendation not found.');
  }

  return recommendation;
}
