import type { RequestHandler } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { DiscoveryService } from '../service/index.js';
import type { UserSearchQuery } from '../types/index.js';

export class DiscoveryController {
  constructor(private service: DiscoveryService) {}

  search: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const query = req.query as unknown as UserSearchQuery;
      const result = await this.service.searchUsers(req.user.id, query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  suggestions: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const { limit } = req.query as unknown as { limit?: number };
      const result = await this.service.getSuggestions(req.user.id, limit ?? 10);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  recentSearches: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      const result = await this.service.getRecentSearches(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  clearRecentSearches: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }
      await this.service.clearRecentSearches(req.user.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
