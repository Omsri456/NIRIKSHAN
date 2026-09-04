import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

/**
 * GET /api/dashboard/overview
 * Currently returns the existing mock dataset (real aggregations are a
 * later milestone).
 */
export const overview = (_req: Request, res: Response) => {
  res.json({ success: true, data: dashboardService.getOverview() });
};

/**
 * GET /api/dashboard/trends
 */
export const trends = (_req: Request, res: Response) => {
  res.json({ success: true, data: dashboardService.getTrends() });
};

/**
 * GET /api/dashboard/risk-distribution
 */
export const riskDistribution = (_req: Request, res: Response) => {
  res.json({ success: true, data: dashboardService.getRiskDistribution() });
};

/**
 * GET /api/dashboard/states
 */
export const states = (_req: Request, res: Response) => {
  res.json({ success: true, data: dashboardService.getStates() });
};