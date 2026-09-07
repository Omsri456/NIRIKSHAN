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

/**
 * POST /api/auth/register — body validation.
 */
export const registerSchema = {
  body: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(320),
    password: z.string().min(6).max(200),
    role: z
      .enum(['MINISTRY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'MP', 'ADMIN'])
      .optional()
      .default('DISTRICT_AUTHORITY'),
    scope: z
      .object({
        state: z.string().nullable().optional(),
        district: z.string().nullable().optional(),
        constituency: z.string().nullable().optional(),
      })
      .optional(),
  }),
};