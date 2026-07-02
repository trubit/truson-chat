import type { Request, Response, NextFunction } from 'express';
import { authenticate } from './authenticate.js';
import { AppError } from './errorHandler.js';
import { getEnv } from '../config/env.js';

function checkAdmin(req: Request, _res: Response, next: NextFunction): void {
  const adminEmail = getEnv().ADMIN_EMAIL;
  if (!adminEmail || req.user?.email !== adminEmail) {
    next(new AppError('Admin access required', 403, 'FORBIDDEN'));
    return;
  }
  next();
}

export const requireAdmin = [authenticate, checkAdmin] as const;
