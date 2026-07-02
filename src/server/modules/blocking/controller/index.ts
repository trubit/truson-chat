import type { RequestHandler } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { BlockingService } from '../service/index.js';
import type { BlockUserDto, MuteUserDto, BlockListQuery } from '../types/index.js';

export class BlockingController {
  constructor(private service: BlockingService) {}

  getBlockedList: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const query = req.query as unknown as BlockListQuery;
      const result = await this.service.getBlockedUsers(req.user.id, query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  blockUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      const dto = req.body as BlockUserDto;
      const result = await this.service.blockUser(req.user.id, userId, dto);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  unblockUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      await this.service.unblockUser(req.user.id, userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  getMutedList: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const query = req.query as unknown as BlockListQuery;
      const result = await this.service.getMutedUsers(req.user.id, query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  muteUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      const dto = req.body as MuteUserDto;
      const result = await this.service.muteUser(req.user.id, userId, dto);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  unmuteUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      await this.service.unmuteUser(req.user.id, userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  checkBlockStatus: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { userId } = req.params as { userId: string };
      const [isBlocked, isMutedByMe] = await Promise.all([
        this.service.isUserBlocked(req.user.id, userId),
        this.service.isUserMuted(req.user.id, userId),
      ]);
      res.status(200).json({ success: true, data: { isBlocked, isMutedByMe } });
    } catch (err) {
      next(err);
    }
  };
}
