import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as investigationService from '../services/investigation.service';

/**
 * POST /api/investigations
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const investigation = await investigationService.createInvestigation(req.body, req.user?._id);
  res.status(201).json({ success: true, data: investigation });
});

/**
 * GET /api/investigations — paginated list, optionally by status.
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { investigations, pagination } = await investigationService.listInvestigations(
    req.query as unknown as investigationService.InvestigationListQuery
  );
  res.json({ success: true, data: investigations, pagination });
});

/**
 * GET /api/investigations/:id
 */
export const get = asyncHandler(async (req: Request, res: Response) => {
  const investigation = await investigationService.getInvestigation(req.params.id);
  res.json({ success: true, data: investigation });
});

/**
 * PATCH /api/investigations/:id
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const investigation = await investigationService.updateInvestigation(req.params.id, req.body);
  res.json({ success: true, data: investigation });
});

/**
 * POST /api/investigations/:id/notes
 */
export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const investigation = await investigationService.addNote(
    req.params.id,
    req.body.content,
    req.user
  );
  res.json({ success: true, data: investigation });
});