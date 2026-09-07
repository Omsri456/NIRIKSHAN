import { Request, Response } from 'express';
import { asyncHandler } from '../utils';
import * as authService from '../services/auth.service';

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login({
    email: req.body.email,
    password: req.body.password,
  });
  res.json({ success: true, data });
});

/**
 * POST /api/auth/logout
 * JWT is stateless — the client discards the token.
 */
export const logout = (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: 'Logged out successfully.' } });
};

/**
 * GET /api/auth/me
 */
export const me = (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
};