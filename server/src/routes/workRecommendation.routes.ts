import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createRecommendationSchema,
  listRecommendationsSchema,
  updateRecommendationStatusSchema,
} from '../validators/workRecommendation.validator';
import * as workRecommendationController from '../controllers/workRecommendation.controller';

const router = Router();

// POST /api/recommendations — MP recommends new work
router.post(
  '/',
  authenticate,
  authorize('MP'),
  validate(createRecommendationSchema),
  workRecommendationController.create
);

// GET /api/recommendations — List recommendations (scoped / MP filtered)
router.get(
  '/',
  authenticate,
  validate(listRecommendationsSchema),
  workRecommendationController.list
);

// PATCH /api/recommendations/:id/status — District/State Authority/Ministry/Admin update status
router.patch(
  '/:id/status',
  authenticate,
  authorize('DISTRICT_AUTHORITY', 'STATE_AUTHORITY', 'MINISTRY', 'ADMIN'),
  validate(updateRecommendationStatusSchema),
  workRecommendationController.updateStatus
);

export default router;
