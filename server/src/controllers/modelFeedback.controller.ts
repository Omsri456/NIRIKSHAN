import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import { getModelPrecisionStats } from '../services/modelFeedback.service';

/**
 * GET /api/model-feedback/precision
 * Returns model precision statistics based on resolved investigations.
 */
export const precisionStats = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const stats = await getModelPrecisionStats(scopeFilter);
  res.json({ success: true, data: stats });
});
