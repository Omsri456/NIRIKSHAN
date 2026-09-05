import { Request, Response, NextFunction } from 'express';

/**
 * Geographic scope filter middleware.
 * Restricts query results based on user's assigned scope.
 * MINISTRY / ADMIN see everything, others are filtered to their state/district/constituency.
 */
export function applyScopeFilter(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next();
    return;
  }

  // Ministry and Admin have national-level access
  if (req.user.role === 'MINISTRY' || req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Apply scope constraints to query params
  const { scope } = req.user;

  if (scope.state) {
    req.query.state = scope.state;
  }
  if (scope.district) {
    req.query.district = scope.district;
  }
  if (scope.constituency) {
    req.query.constituency = scope.constituency;
  }

  next();
}
