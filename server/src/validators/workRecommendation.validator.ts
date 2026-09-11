import { z } from 'zod';

/**
 * POST /api/recommendations — Create schema
 */
export const createRecommendationSchema = {
  body: z.object({
    description: z.string().min(1, 'Description is required').max(2000),
    category: z.string().min(1, 'Category is required').max(100),
    estimatedCost: z.number().positive('Estimated cost must be positive'),
    justification: z.string().min(1, 'Justification is required').max(2000),
    constituency: z.string().min(1, 'Constituency is required').max(100),
    district: z.string().min(1, 'District is required').max(100),
    state: z.string().min(1, 'State is required').max(100),
  }),
};

/**
 * PATCH /api/recommendations/:id/status — Update status schema
 */
export const updateRecommendationStatusSchema = {
  params: z.object({
    id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid recommendation ID'),
  }),
  body: z.object({
    status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  }),
};

/**
 * GET /api/recommendations — List query schema
 */
export const listRecommendationsSchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  }),
};
