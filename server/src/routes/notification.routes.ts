import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/notifications
router.get('/', notificationController.list);

export default router;
