import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import { validate } from '../middleware/validate';
import { highRiskSchema } from '../validators';
import * as riskController from '../controllers/risk.controller';

const router = Router();

// GET /api/risk/high-risk
router.get(
  '/high-risk',
  validate(highRiskSchema),
  authenticate,
  applyScopeFilter,
  riskController.highRisk
);

// GET /api/risk/alerts
router.get('/alerts', authenticate, applyScopeFilter, riskController.alerts);

// GET /api/risk/signals
router.get('/signals', authenticate, applyScopeFilter, riskController.signals);

export default router;
