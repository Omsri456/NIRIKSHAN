import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../utils';

/**
 * Describes the Zod schemas a route expects for body / query / params.
 * Any part that is not present is not validated.
 */
export interface ValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

/** Extend Express Request with the validated (parsed) inputs. */
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

/**
 * Reusable validation middleware.
 *
 * Validates `req.body`, `req.query` and `req.params` against the supplied
 * Zod schemas. On success, the parsed (and defaulted/coerced) values are
 * written back onto the request objects so downstream middleware (e.g. the
 * scope filter) and controllers can read them directly.
 *
 * On failure a controlled 400 `INVALID_REQUEST` response is produced.
 * Internal Zod details and stack traces are never exposed.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed: { body?: unknown; query?: unknown; params?: unknown } = {};

    try {
      if (schemas.body) {
        const result = schemas.body.parse(req.body ?? {});
        parsed.body = result;
        applyParsed(req.body, result);
      }
      if (schemas.query) {
        const result = schemas.query.parse(req.query ?? {});
        parsed.query = result;
        applyParsed(req.query, result);
      }
      if (schemas.params) {
        const result = schemas.params.parse(req.params ?? {});
        parsed.params = result;
        applyParsed(req.params, result);
      }
    } catch {
      next(new AppError(400, 'INVALID_REQUEST', 'Invalid request parameters.'));
      return;
    }

    req.validated = parsed;
    next();
  };
}

/**
 * Replaces the keys of a mutable request object (query / params / body)
 * with the validated values, removing any unexpected/invalid entries.
 */
function applyParsed(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  for (const key of Object.keys(source)) {
    target[key] = source[key];
  }
}