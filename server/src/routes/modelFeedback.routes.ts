import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import * as modelFeedbackController from '../controllers/modelFeedback.controller';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/model-feedback/precision — Model precision stats from verified investigations
router.get('/precision', modelFeedbackController.precisionStats);

export default router;
