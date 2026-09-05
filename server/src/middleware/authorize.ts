import { Request, Response, NextFunction } from 'express';

/**
 * Role-based authorization middleware.
 * Pass allowed roles — if user's role is not in the list, deny access.
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' },
      });
      return;
    }

    next();
  };
}
