import { z } from 'zod';

/**
 * POST /api/auth/login — body validation.
 * `email` and `password` are required non-empty strings with a sensible
 * length cap. Email is lowercased later in the auth service (existing
 * behavior is preserved).
 */
export const loginSchema = {
  body: z.object({
    email: z.string().min(1).max(320),
    password: z.string().min(1).max(200),
  }),
};