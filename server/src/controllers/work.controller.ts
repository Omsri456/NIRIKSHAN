import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as workService from '../services/work.service';

/**
 * GET /api/works — paginated, filtered, sorted works.
 */
export const getWorks = asyncHandler(async (req: Request, res: Response) => {
  const { works, pagination } = await workService.listWorks(
    req.query as unknown as workService.WorkListQuery
  );
  res.json({ success: true, data: works, pagination });
});

/**
 * GET /api/works/:workId
 */
export const getWork = asyncHandler(async (req: Request, res: Response) => {
  const work = await workService.getWork(req.params.workId);
  res.json({ success: true, data: work });
});

/**
 * GET /api/works/:workId/expenditures
 */
export const getExpenditures = asyncHandler(async (req: Request, res: Response) => {
  const expenditures = await workService.getExpenditures(req.params.workId);
  res.json({ success: true, data: expenditures });
});

/**
 * GET /api/works/:workId/risk — latest risk assessment (data: null if none).
 */
export const getRisk = asyncHandler(async (req: Request, res: Response) => {
  const latest = await workService.getLatestRisk(req.params.workId);
  res.json({ success: true, data: latest });
});

/**
 * GET /api/works/:workId/risk-history
 */
export const getRiskHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await workService.getRiskHistory(req.params.workId);
  res.json({ success: true, data: history });
});

/**
 * GET /api/works/:workId/similar — currently returns an empty array.
 */
export const getSimilar = asyncHandler(async (req: Request, res: Response) => {
  const similar = await workService.getSimilarWorks(req.params.workId);
  res.json({ success: true, data: similar });
});