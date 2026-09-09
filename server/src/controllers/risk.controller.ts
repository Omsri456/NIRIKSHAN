import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import * as riskService from '../services/risk.service';

/**
 * GET /api/risk/high-risk — latest HIGH/CRITICAL assessments, paginated.
 * Scoped to user's geographic access.
 */
export const highRisk = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const { data, pagination } = await riskService.getHighRisk(
    req.query as unknown as riskService.HighRiskQuery,
    scopeFilter
  );
  res.json({ success: true, data, pagination });
});

/**
 * GET /api/risk/alerts — real risk-based alerts from MongoDB.
 */
export const alerts = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const data = await riskService.getAlerts(scopeFilter);
  res.json({ success: true, data });
});

/**
 * GET /api/risk/signals — real signal type distribution from MongoDB.
 */
export const signals = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const data = await riskService.getSignals(scopeFilter);
  res.json({ success: true, data });
});