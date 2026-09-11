import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

// GET /api/auth/users
router.get('/users', authenticate, authController.listUsers);

export default router;

