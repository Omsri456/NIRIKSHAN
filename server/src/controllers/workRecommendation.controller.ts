import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import * as workRecommendationService from '../services/workRecommendation.service';

/**
 * POST /api/recommendations — Create a new work recommendation.
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id as string;
  const recommendation = await workRecommendationService.createRecommendation(req.body, userId);
  res.status(201).json({ success: true, data: recommendation });
});

/**
 * GET /api/recommendations — List work recommendations.
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user as any);
  const userRole = req.user?.role as string;
  const userId = req.user?._id as string;

  const { recommendations, pagination } = await workRecommendationService.listRecommendations(
    req.query as unknown as workRecommendationService.RecommendationListQuery,
    scopeFilter,
    userRole,
    userId
  );

  res.json({ success: true, data: recommendations, pagination });
});

/**
 * PATCH /api/recommendations/:id/status — Update recommendation status.
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user?.role as string;
  const recommendation = await workRecommendationService.updateRecommendationStatus(
    req.params.id,
    req.body.status,
    userRole
  );

  res.json({ success: true, data: recommendation });
});
