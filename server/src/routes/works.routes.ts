import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import { validate } from '../middleware/validate';
import { listWorksSchema, workParamsSchema } from '../validators';
import * as workController from '../controllers/work.controller';

const router = Router();

// GET /api/works
router.get(
  '/',
  validate(listWorksSchema),
  authenticate,
  applyScopeFilter,
  workController.getWorks
);

// GET /api/works/:workId
router.get(
  '/:workId',
  validate(workParamsSchema),
  authenticate,
  applyScopeFilter,
  workController.getWork
);

// GET /api/works/:workId/expenditures
router.get(
  '/:workId/expenditures',
  validate(workParamsSchema),
  authenticate,
  applyScopeFilter,
  workController.getExpenditures
);

// GET /api/works/:workId/risk
router.get(
  '/:workId/risk',
  validate(workParamsSchema),
  authenticate,
  applyScopeFilter,
  workController.getRisk
);

// GET /api/works/:workId/risk-history
router.get(
  '/:workId/risk-history',
  validate(workParamsSchema),
  authenticate,
  applyScopeFilter,
  workController.getRiskHistory
);

// GET /api/works/:workId/similar
router.get(
  '/:workId/similar',
  validate(workParamsSchema),
  authenticate,
  applyScopeFilter,
  workController.getSimilar
);

export default router;
