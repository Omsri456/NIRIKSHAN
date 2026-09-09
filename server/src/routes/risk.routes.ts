import { Router } from 'express';
import { z } from 'zod';
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

// GET /api/risk/early-warnings
router.get('/early-warnings', authenticate, applyScopeFilter, riskController.earlyWarnings);

// PATCH /api/risk/early-warnings/:id/acknowledge
router.patch(
  '/early-warnings/:id/acknowledge',
  authenticate,
  validate({ params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) }) }),
  riskController.acknowledgeEarlyWarning
);

export default router;

