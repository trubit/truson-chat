import type { RequestHandler } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { PresenceService } from '../service/index.js';
import type { UpdatePresenceDto } from '../types/index.js';

export class PresenceController {
  constructor(private service: PresenceService) {}

  getOwn: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const result = await this.service.getOwnPresence(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const dto = req.body as UpdatePresenceDto;
      const result = await this.service.updatePresence(req.user.id, dto);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      const result = await this.service.getPresence(req.user.id, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  batchGet: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userIds } = req.body as { userIds: string[] };
      const result = await this.service.getMultiplePresences(req.user.id, userIds);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
