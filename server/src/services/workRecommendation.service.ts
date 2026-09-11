import mongoose from 'mongoose';
import { WorkRecommendationModel } from '../models/WorkRecommendation';
import { WorkModel } from '../models/Work';
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
    description: body.description.trim(),
    category: body.category.trim(),
    estimatedCost: body.estimatedCost,
    justification: body.justification.trim(),
    constituency: body.constituency.trim(),
    district: body.district.trim(),
    state: body.state.trim(),
    status: 'SUBMITTED',
    recommendedBy: new mongoose.Types.ObjectId(userId),
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
    filter.recommendedBy = new mongoose.Types.ObjectId(userId);
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
 * When approved by Authority/Admin, automatically sanctions and provisions
 * a new official Work in WorkModel with full lineage tracking.
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

  const existingRec = await WorkRecommendationModel.findById(id);
  if (!existingRec) {
    throw new AppError(404, 'RECOMMENDATION_NOT_FOUND', 'Work recommendation not found.');
  }

  let createdWorkId = existingRec.createdWorkId;

  // When status transitions to APPROVED, provision an official sanctioned Work
  if (status === 'APPROVED' && !createdWorkId) {
    const totalWorks = await WorkModel.countDocuments();
    const workId = `MPLADS-W-${25000 + totalWorks + 1}`;

    const mpPopulated = await existingRec.populate('recommendedBy', 'name email role scope');
    const mpName = (mpPopulated.recommendedBy as any)?.name || 'Member of Parliament';

    await WorkModel.create({
      workId,
      description: existingRec.description,
      category: existingRec.category,
      mp: {
        name: mpName,
        house: 'Lok Sabha',
      },
      location: {
        state: existingRec.state,
        district: existingRec.district,
        constituency: existingRec.constituency,
      },
      implementingAgency: {
        name: `${existingRec.district} District Rural Development Agency (DRDA)`,
        type: 'District Administration',
      },
      recommendation: {
        date: existingRec.createdAt,
        amount: existingRec.estimatedCost,
      },
      execution: {
        startDate: new Date(),
        completionDate: null,
        status: 'SANCTIONED',
      },
      financial: {
        finalAmount: existingRec.estimatedCost,
        totalExpenditure: 0,
      },
      asset: {
        description: `${existingRec.category} facility in ${existingRec.constituency}`,
        status: 'PENDING',
      },
      source: {
        dataset: 'MP Recommendation Workflow',
        lastUpdated: new Date(),
      },
    });

    createdWorkId = workId;
  }

  const recommendation = await WorkRecommendationModel.findByIdAndUpdate(
    id,
    { status, createdWorkId },
    { new: true, runValidators: true }
  )
    .populate('recommendedBy', 'name email role scope')
    .lean();

  return recommendation;
}
