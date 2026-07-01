import type { Request, Response } from 'express';
import type { ApiError } from '../../shared/types/index.js';

/**
 * Catch-all 404 handler. Must be mounted after all routes.
 * Returns an ApiError-shaped JSON body so clients can handle it uniformly.
 */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  };

  res.status(404).json(body);
}
