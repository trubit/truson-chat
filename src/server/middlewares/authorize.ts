import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { authenticate } from './authenticate.js';

// ---------------------------------------------------------------------------
// authorize — role-based access control
// ---------------------------------------------------------------------------

/**
 * Middleware factory that restricts access to users whose role is in the
 * provided list. `authenticate` must have already run (or is called first
 * inside the returned middleware when used stand-alone on a route).
 *
 * Usage:
 *   router.delete('/users/:id', authorize('admin'), handler);
 *   router.post('/plans', authorize('admin', 'business'), handler);
 */
export function authorize(
  ...roles: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // authenticate was not run upstream — run it now, then re-enter
      authenticate(req, res, (err?: unknown) => {
        if (err) {
          next(err);
          return;
        }
        checkRole(req, next, roles);
      });
      return;
    }

    checkRole(req, next, roles);
  };
}

function checkRole(req: Request, next: NextFunction, roles: string[]): void {
  if (!req.user) {
    // Should never happen after authenticate succeeds, but guard defensively
    next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    return;
  }

  if (!roles.includes(req.user.role)) {
    next(new AppError(`Access denied. Required role(s): ${roles.join(', ')}`, 403, 'FORBIDDEN'));
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// Convenience shorthands
// ---------------------------------------------------------------------------

/** Restricts the route to admin users only. */
export const isAdmin = authorize('admin');

/** Restricts the route to admin or business users. */
export const isAdminOrBusiness = authorize('admin', 'business');
