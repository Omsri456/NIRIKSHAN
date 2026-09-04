import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as riskService from '../services/risk.service';

/**
 * GET /api/risk/high-risk — latest HIGH/CRITICAL assessments, paginated.
 */
export const highRisk = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await riskService.getHighRisk(
    req.query as unknown as riskService.HighRiskQuery
  );
  res.json({ success: true, data, pagination });
});

/**
 * GET /api/risk/alerts — stub returning an empty array.
 */
export const alerts = asyncHandler(async (_req: Request, res: Response) => {
  const data = await riskService.getAlerts();
  res.json({ success: true, data });
});

/**
 * GET /api/risk/signals — mock signal distribution.
 */
export const signals = (_req: Request, res: Response) => {
  res.json({ success: true, data: riskService.getSignals() });
};