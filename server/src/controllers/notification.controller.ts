import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import { generateNotifications } from '../services/notification.service';

/**
 * GET /api/notifications
 * Returns role-filtered notifications derived from existing data.
 * Uses the same scope-filter pattern as dashboard and works controllers.
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const role = req.user?.role || 'MINISTRY';

  const notifications = await generateNotifications({ role, scopeFilter });

  res.json({ success: true, data: notifications });
});
