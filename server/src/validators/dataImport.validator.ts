import { z } from 'zod';

/**
 * POST /api/data-imports — body validation.
 * Only the fields the current placeholder API actually accepts are
 * validated. ETL is not implemented in this phase.
 */
export const createDataImportSchema = {
  body: z.object({
    filename: z.string().min(1).max(255).optional(),
    dataset: z.string().min(1).max(100).optional(),
  }),
};