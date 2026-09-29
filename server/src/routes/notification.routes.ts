import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/notifications
router.get('/', notificationController.list);

// POST /api/notifications/dismiss — dismiss specific notification IDs
router.post('/dismiss', notificationController.dismiss);

// POST /api/notifications/dismiss-all — dismiss all current notifications
router.post('/dismiss-all', notificationController.dismissAll);

export default router;
