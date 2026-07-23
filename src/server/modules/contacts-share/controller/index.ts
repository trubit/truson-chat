import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import { sharedContactService } from '../service/index.js';
import { createSharedContactSchema } from '../validator/index.js';

class SharedContactController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
        return;
      }

      const parsed = createSharedContactSchema.safeParse(req.body);
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

      const result = await sharedContactService.create(req.user.id, parsed.data);
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
      const result = await sharedContactService.getById(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const sharedContactController = new SharedContactController();
