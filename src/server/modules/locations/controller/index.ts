import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import { sharedLocationService } from '../service/index.js';
import { shareLocationSchema } from '../validator/index.js';

class SharedLocationController {
  async share(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }

      const parsed = shareLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        next(
          new AppError(
            parsed.error.issues[0]?.message ?? 'Validation error',
            400,
            'VALIDATION_ERROR',
          ),
        );
        return;
      }

      const result = await sharedLocationService.share(req.user.id, parsed.data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }
      const id = req.params['id'] as string;
      const result = await sharedLocationService.getById(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const sharedLocationController = new SharedLocationController();
