import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils';

/**
 * Centralized error handling middleware.
 * - Expected application errors (AppError) are converted to controlled
 *   API responses with their associated status code and code.
 * - Unexpected errors return a generic 500 without leaking internals.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Expected application error → controlled response (no stack trace leaked)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  console.error('❌ Unhandled Error:', err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'An unexpected error occurred.',
    },
  });
}
