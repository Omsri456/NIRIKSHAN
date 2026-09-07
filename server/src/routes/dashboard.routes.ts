import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { applyScopeFilter } from '../middleware/scopeFilter';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate, applyScopeFilter);

// GET /api/dashboard/overview
router.get('/overview', dashboardController.overview);

// GET /api/dashboard/trends
router.get('/trends', dashboardController.trends);

// GET /api/dashboard/risk-distribution
router.get('/risk-distribution', dashboardController.riskDistribution);

// GET /api/dashboard/states
router.get('/states', dashboardController.states);

export default router;
