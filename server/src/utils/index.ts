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

/**
 * Builds a MongoDB query filter from the user's geographic scope.
 * - MINISTRY and ADMIN get an empty filter (national access).
 * - MP is filtered strictly to their assigned parliamentary constituency (and state if provided).
 *   If no constituency is assigned (e.g. Rajya Sabha MP), filters by their assigned state/district.
 * - STATE_AUTHORITY is filtered strictly to their assigned state.
 * - DISTRICT_AUTHORITY is filtered strictly to their assigned district and state.
 *
 * Case-insensitive matching ensures that dataset casing differences (e.g. 'MUMBAI NORTH' vs 'Mumbai North')
 * seamlessly match the user's assigned scope.
 */
export function buildScopeFilter(user?: {
  role: string;
  scope?: { state?: string | null; district?: string | null; constituency?: string | null } | null;
}): Record<string, unknown> {
  if (!user) return {};
  if (user.role === 'MINISTRY' || user.role === 'ADMIN') return {};

  const filter: Record<string, unknown> = {};

  if (user.role === 'MP') {
    // A Lok Sabha MP represents their parliamentary constituency.
    // Case-insensitive regex ensures casing differences ('Mumbai North' vs 'MUMBAI NORTH', 'Pune' vs 'PUNE')
    // match the exact constituency records from the dataset.
    // We do NOT filter on district when constituency is present, because parliamentary
    // constituencies often span or reside in sub-districts (e.g. 'Mumbai Suburban' vs 'Mumbai').
    if (user.scope?.constituency) {
      filter['location.constituency'] = new RegExp(`^${escapeRegex(user.scope.constituency.trim())}$`, 'i');
      if (user.scope?.state) {
        filter['location.state'] = new RegExp(`^${escapeRegex(user.scope.state.trim())}$`, 'i');
      }
      return filter;
    }

    // Rajya Sabha MP (who may represent a state or a nominated district)
    if (user.scope?.district) {
      filter['location.district'] = new RegExp(`^${escapeRegex(user.scope.district.trim())}$`, 'i');
    }
    if (user.scope?.state) {
      filter['location.state'] = new RegExp(`^${escapeRegex(user.scope.state.trim())}$`, 'i');
    }
    return filter;
  }

  if (user.role === 'STATE_AUTHORITY') {
    if (user.scope?.state) {
      filter['location.state'] = new RegExp(`^${escapeRegex(user.scope.state.trim())}$`, 'i');
    }
    return filter;
  }

  if (user.role === 'DISTRICT_AUTHORITY') {
    if (user.scope?.state) {
      filter['location.state'] = new RegExp(`^${escapeRegex(user.scope.state.trim())}$`, 'i');
    }
    if (user.scope?.district) {
      filter['location.district'] = new RegExp(`^${escapeRegex(user.scope.district.trim())}$`, 'i');
    }
    return filter;
  }

  // Fallback for any other custom role
  if (user.scope?.state) filter['location.state'] = new RegExp(`^${escapeRegex(user.scope.state.trim())}$`, 'i');
  if (user.scope?.district) filter['location.district'] = new RegExp(`^${escapeRegex(user.scope.district.trim())}$`, 'i');
  if (user.scope?.constituency) filter['location.constituency'] = new RegExp(`^${escapeRegex(user.scope.constituency.trim())}$`, 'i');
  return filter;
}

