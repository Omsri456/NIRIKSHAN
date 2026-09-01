import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel } from '../models/User';

/** Extend Express Request to include authenticated user */
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        name: string;
        email: string;
        role: string;
        scope: {
          state: string | null;
          district: string | null;
          constituency: string | null;
        };
      };
    }
  }
}

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches user to req.user.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const user = await UserModel.findById(decoded.userId).select('-passwordHash');
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' },
      });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      scope: user.scope,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' },
    });
  }
}
