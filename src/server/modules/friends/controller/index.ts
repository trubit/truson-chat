import type { Request, Response, NextFunction } from 'express';
import type { FriendsService } from '../service/index.js';
import type { FriendListQuery, SendFriendRequestDto } from '../types/index.js';

export class FriendsController {
  constructor(private readonly service: FriendsService) {}

  listFriends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as FriendListQuery;
      const result = await this.service.getFriends(req.user!.id, query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  sendRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as SendFriendRequestDto;
      const result = await this.service.sendRequest(req.user!.id, dto);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getReceivedRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await this.service.getReceivedRequests(req.user!.id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getSentRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await this.service.getSentRequests(req.user!.id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  acceptRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params as { requestId: string };
      const result = await this.service.acceptRequest(req.user!.id, requestId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  rejectRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params as { requestId: string };
      await this.service.rejectRequest(req.user!.id, requestId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  };

  cancelRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = req.params as { requestId: string };
      await this.service.cancelRequest(req.user!.id, requestId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  removeFriend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { friendId } = req.params as { friendId: string };
      await this.service.removeFriend(req.user!.id, friendId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  checkStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params as { userId: string };
      const result = await this.service.checkFriendshipStatus(req.user!.id, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
