import type { RequestHandler } from 'express';
import { AppError } from '../../../middlewares/errorHandler.js';
import type { UsersService } from '../service/index.js';
import type { UpdateUserInput, UpdateStatusInput, UserListQuery } from '../types/index.js';

export class UsersController {
  constructor(private service: UsersService) {}

  getUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const requesterId = req.user!.id;
      const requesterRole = req.user!.role;
      const { id } = req.params as { id: string };

      const result = await this.service.getUserById(requesterId, requesterRole, id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  listUsers: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const requesterId = req.user!.id;
      const requesterRole = req.user!.role;
      const query = req.query as unknown as UserListQuery;

      const result = await this.service.listUsers(requesterId, requesterRole, query);
      res.status(200).json({ success: true, data: result.users, meta: result.meta });
    } catch (err) {
      next(err);
    }
  };

  updateUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const requesterId = req.user.id;
      const requesterRole = req.user.role;
      const { id } = req.params as { id: string };
      const data = req.body as UpdateUserInput;
      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.updateUser(
        requesterId,
        requesterRole,
        id,
        data,
        ip,
        ua,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  deleteUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const requesterId = req.user.id;
      const requesterRole = req.user.role;
      const { id } = req.params as { id: string };
      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      await this.service.deleteUser(requesterId, requesterRole, id, ip, ua);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  updateStatus: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
        return;
      }

      const requesterId = req.user.id;
      const { id } = req.params as { id: string };
      const data = req.body as UpdateStatusInput;
      const ip = req.ip ?? '';
      const ua = req.headers['user-agent'] ?? '';

      const result = await this.service.updateUserStatus(requesterId, id, data, ip, ua);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  searchUsers: RequestHandler = async (req, res, next): Promise<void> => {
    try {
      const q = (req.query['q'] as string | undefined) ?? '';
      const limitParam = req.query['limit'];
      const limit = limitParam ? Math.min(parseInt(limitParam as string, 10) || 10, 50) : 10;

      if (!q.trim()) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const results = await this.service.searchUsers(q.trim(), limit);
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  };
}
