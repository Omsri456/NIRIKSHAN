import { z } from 'zod';
import { paginationQuerySchema } from './pagination.validator';

/**
 * Investigation status / priority / finding enum values.
 * These mirror the Investigation model and the shared contracts.
 */
export const INVESTIGATION_STATUSES = [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED',
] as const;

export const INVESTIGATION_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export const INVESTIGATION_FINDINGS = [
  'NO_ISSUE',
  'MINOR_IRREGULARITY',
  'MAJOR_IRREGULARITY',
  'REFERRED_FOR_ACTION',
] as const;

/**
 * POST /api/investigations — body validation.
 */
export const createInvestigationSchema = {
  body: z.object({
    workId: z.string().min(1).max(100),
    priority: z.enum(INVESTIGATION_PRIORITIES).optional(),
  }),
};

/**
 * GET /api/investigations — query validation.
 */
export const listInvestigationsSchema = {
  query: paginationQuerySchema.extend({
    status: z.enum(INVESTIGATION_STATUSES).optional(),
  }),
};

/**
 * MongoDB ObjectId format: exactly 24 hex characters.
 */
const MONGO_ID_REGEX = /^[a-f0-9]{24}$/i;

/**
 * Path parameter schema for the investigation-scoped endpoints.
 * The id must be a valid MongoDB ObjectId so malformed ids produce a
 * controlled 400 instead of a leaked Mongoose CastError (500).
 */
export const investigationIdSchema = {
  params: z.object({
    id: z.string().regex(MONGO_ID_REGEX),
  }),
};

/**
 * PATCH /api/investigations/:id — body validation.
 * All fields are optional so a partial update is allowed. `finding` may be
 * explicitly set to null. `assignedTo` must be a valid ObjectId format.
 */
export const updateInvestigationSchema = {
  body: z.object({
    status: z.enum(INVESTIGATION_STATUSES).optional(),
    priority: z.enum(INVESTIGATION_PRIORITIES).optional(),
    finding: z.union([z.enum(INVESTIGATION_FINDINGS), z.null()]).optional(),
    assignedTo: z.string().regex(MONGO_ID_REGEX).optional(),
  }),
};

/**
 * POST /api/investigations/:id/notes — body validation.
 */
export const addNoteSchema = {
  body: z.object({
    content: z.string().min(1).max(5000),
  }),
};