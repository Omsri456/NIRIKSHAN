import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import * as userController from '../controllers/user.controller';

const router = Router();

// GET /api/users/pending — Admin-only
router.get('/pending', authenticate, authorize('ADMIN'), userController.listPending);

// PATCH /api/users/:id/approve — Admin-only
router.patch('/:id/approve', authenticate, authorize('ADMIN'), userController.approve);

// PATCH /api/users/:id/reject — Admin-only
router.patch('/:id/reject', authenticate, authorize('ADMIN'), userController.reject);

export default router;
