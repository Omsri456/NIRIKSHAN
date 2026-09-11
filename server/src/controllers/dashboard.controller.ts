import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import * as dashboardService from '../services/dashboard.service';

/**
 * GET /api/dashboard/overview
 * Real MongoDB aggregation, scoped to user's geographic access.
 */
export const overview = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const data = await dashboardService.getOverview(scopeFilter);
  res.json({ success: true, data });
});

/**
 * GET /api/dashboard/trends
 */
export const trends = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const timeframe = (req.query.timeframe as string) || 'Quarterly';
  const data = await dashboardService.getTrends(scopeFilter, timeframe);
  res.json({ success: true, data });
});

/**
 * GET /api/dashboard/risk-distribution
 */
export const riskDistribution = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const data = await dashboardService.getRiskDistribution(scopeFilter);
  res.json({ success: true, data });
});

/**
 * GET /api/dashboard/states
 */
export const states = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const data = await dashboardService.getStates(scopeFilter);
  res.json({ success: true, data });
});

/**
 * GET /api/dashboard/risk-map
 * Real district-level aggregation of existing works & risk assessments,
 * strictly scoped to user's geographic permissions.
 */
export const riskMap = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const data = await dashboardService.getDistrictsRiskSummary(scopeFilter, req.user);
  res.json({ success: true, data });
});