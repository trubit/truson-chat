import type { Request, Response, NextFunction } from 'express';
import { channelService } from '../service/index.js';

export class ChannelController {
  async createChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await channelService.createChannel(req.user!.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getChannels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await channelService.getChannels(req.user!.id, String(req.params.groupId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await channelService.getChannel(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await channelService.updateChannel(
        req.user!.id,
        String(req.params.id),
        req.body,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await channelService.deleteChannel(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.body as { userId: string };
      await channelService.addChannelMember(req.user!.id, String(req.params.id), userId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await channelService.removeChannelMember(
        req.user!.id,
        String(req.params.id),
        String(req.params.userId),
      );
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }
}

export const channelController = new ChannelController();
