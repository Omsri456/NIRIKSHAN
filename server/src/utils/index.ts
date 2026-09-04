import { NextFunction, Request, Response } from 'express';

// ============================================================
// Utilities — Shared helper functions for the backend
// ============================================================

/**
 * Application error with an HTTP status, a stable error code and a
 * human-readable message. Expected application errors are thrown and
 * converted to a controlled API response by the global error handler.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Wraps an async Express handler so that unexpected errors are forwarded
 * to the global error handler instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Escapes user-supplied input before it is embedded in a MongoDB $regex.
 * Prevents user input from being interpreted as regex metacharacters
 * (e.g. unbounded/unsafe patterns from `.*`, `[a-z]+`, etc.).
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Allowlist of sortable fields exposed by the works list API.
 * Mapping friendly names to their actual MongoDB paths.
 */
export const SORT_FIELDS: string[] = [
  'workId',
  'description',
  'category',
  'updatedAt',
  'createdAt',
  'state',
  'district',
  'constituency',
  'status',
];

export const SORT_FIELD_MAP: Record<string, string> = {
  workId: 'workId',
  description: 'description',
  category: 'category',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
  state: 'location.state',
  district: 'location.district',
  constituency: 'location.constituency',
  status: 'execution.status',
};

/**
 * Builds an allowlisted Mongoose sort object. The field must already have
 * been validated against `SORT_FIELDS`; a leading `-` means descending.
 * Defaults to `updatedAt` descending when no sort is provided (existing
 * API behavior).
 */
export function buildSortObject(sort?: string): Record<string, 1 | -1> {
  if (!sort) {
    return { updatedAt: -1 };
  }

  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  const dbField = SORT_FIELD_MAP[field] ?? field;

  return { [dbField]: descending ? -1 : 1 };
}
