import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
      return;
    }

    const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          scope: user.scope,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed.' },
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  // JWT is stateless — client discards the token
  res.json({ success: true, data: { message: 'Logged out successfully.' } });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

export default router;
