import { Request, Response } from 'express';
import { asyncHandler, buildScopeFilter } from '../utils';
import {
  generateNotifications,
  dismissNotifications,
  dismissAllNotifications,
} from '../services/notification.service';

/**
 * GET /api/notifications
 * Returns role-filtered notifications derived from existing data.
 * Now passes userId so dismissed notifications are filtered out.
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = buildScopeFilter(req.user);
  const role = req.user?.role || 'MINISTRY';
  const userId = req.user?._id?.toString();

  const notifications = await generateNotifications({ role, scopeFilter, userId });

  res.json({ success: true, data: notifications });
});

/**
 * POST /api/notifications/dismiss
 * Body: { notificationIds: string[] }
 * Marks specific notifications as dismissed for the current user.
 */
export const dismiss = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  if (!userId) {
    res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    return;
  }

  const { notificationIds } = req.body || {};
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    res.status(400).json({
      success: false,
      error: { message: 'notificationIds must be a non-empty array of strings.' },
    });
    return;
  }

  const dismissed = await dismissNotifications(userId, notificationIds);
  res.json({ success: true, data: { dismissed } });
});

/**
 * POST /api/notifications/dismiss-all
 * Marks ALL current notifications as dismissed for the current user.
 */
export const dismissAll = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  if (!userId) {
    res.status(401).json({ success: false, error: { message: 'Not authenticated' } });
    return;
  }

  const scopeFilter = buildScopeFilter(req.user);
  const role = req.user?.role || 'MINISTRY';

  const dismissed = await dismissAllNotifications(userId, role, scopeFilter);
  res.json({ success: true, data: { dismissed } });
});
