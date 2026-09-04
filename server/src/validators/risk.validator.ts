import { paginationQuerySchema } from './pagination.validator';

/**
 * GET /api/risk/high-risk — query validation (pagination only).
 */
export const highRiskSchema = {
  query: paginationQuerySchema,
};