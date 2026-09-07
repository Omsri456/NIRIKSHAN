import { z } from 'zod';
import { SORT_FIELDS } from '../utils';

/**
 * Work execution status values supported by the works collection.
 */
export const WORK_STATUSES = [
  'RECOMMENDED',
  'SANCTIONED',
  'IN_PROGRESS',
  'COMPLETED',
  'DROPPED',
] as const;

/**
 * GET /api/works — query validation.
 * - Pagination uses the shared schema (page >= 1, 1 <= limit <= 100).
 * - `status` must be a valid work status enum.
 * - `state` / `district` / `constituency` are free-form strings.
 * - `search` is a bounded string; metacharacters are escaped by the
 *   service before building a MongoDB regex.
 * - `sort` must be one of the allowlisted sort fields (with optional `-`
 *   prefix for descending). Invalid sort fields return a controlled 400.
 */
export const listWorksSchema = {
  query: z
    .object({
      page: z.coerce.number().int().min(1).max(1000000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      state: z.string().max(100).optional(),
      district: z.string().max(100).optional(),
      constituency: z.string().max(100).optional(),
      status: z.enum(WORK_STATUSES).optional(),
      search: z.string().max(200).optional(),
      sort: z.string().max(50).optional(),
    })
    .refine(
      (data) => {
        if (!data.sort) return true;
        const field = data.sort.startsWith('-') ? data.sort.slice(1) : data.sort;
        return SORT_FIELDS.includes(field);
      },
      { path: ['sort'], message: 'Invalid sort field' }
    ),
};

/**
 * Path parameter schema for the work-scoped endpoints.
 */
export const workParamsSchema = {
  params: z.object({
    workId: z.string().min(1).max(100),
  }),
};