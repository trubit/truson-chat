import type { Request, Response, NextFunction } from 'express';
import { communityService } from '../service/index.js';

export class CommunityController {
  async createCommunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.createCommunity(req.user!.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCommunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.getCommunity(String(req.params.id), req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMyCommunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
      const data = await communityService.getMyCommunities(
        req.user!.id,
        Number(page),
        Number(limit),
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async discoverCommunities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        q,
      } = req.query as { page?: string; limit?: string; q?: string };
      const data = await communityService.discoverCommunities({
        page: Number(page),
        limit: Number(limit),
        q,
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateCommunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await communityService.updateCommunity(
        req.user!.id,
        String(req.params.id),
        req.body,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteCommunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await communityService.deleteCommunity(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async joinCommunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await communityService.joinCommunity(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async leaveCommunity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await communityService.leaveCommunity(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async addGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId } = req.body as { groupId: string };
      await communityService.addGroupToCommunity(req.user!.id, String(req.params.id), groupId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async removeGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await communityService.removeGroupFromCommunity(
        req.user!.id,
        String(req.params.id),
        String(req.params.groupId),
      );
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }
}

export const communityController = new CommunityController();
