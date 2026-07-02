import type { RequestHandler } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { PrivacyService } from '../service/index.js';
import type { UpdatePrivacyDto } from '../types/index.js';

export class PrivacyController {
  constructor(private service: PrivacyService) {}

  getSettings: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const result = await this.service.getSettings(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  updateSettings: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const dto = req.body as UpdatePrivacyDto;
      const result = await this.service.updateSettings(req.user.id, dto);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  checkPrivacy: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      const result = await this.service.checkPrivacy(req.user.id, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
