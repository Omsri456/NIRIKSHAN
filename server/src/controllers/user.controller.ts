import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as userService from '../services/user.service';

/**
 * GET /api/users/pending
 * Lists all pending users awaiting admin approval.
 */
export const listPending = asyncHandler(async (_req: Request, res: Response) => {
  const data = await userService.listPendingUsers();
  res.json({ success: true, data });
});

/**
 * PATCH /api/users/:id/approve
 * Approves a pending user.
 */
export const approve = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.approveUser(req.params.id);
  res.json({ success: true, data });
});

/**
 * PATCH /api/users/:id/reject
 * Rejects a pending user.
 */
export const reject = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.rejectUser(req.params.id);
  res.json({ success: true, data });
});
