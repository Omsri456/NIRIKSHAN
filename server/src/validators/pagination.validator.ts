import { z } from 'zod';

/**
 * Shared pagination query schema.
 * - `page` must be a positive integer (defaults to 1).
 * - `limit` must be a positive integer with a safe maximum of 100
 *   (defaults to 20).
 * Malformed values (non-numeric, non-integer, out-of-range) produce a
 * controlled 400 validation error instead of NaN.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});