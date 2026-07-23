import type { Request, Response, NextFunction } from 'express';
import { groupService } from '../service/index.js';

export class GroupController {
  async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.createGroup(req.user!.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.getGroup(String(req.params.id), req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMyGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string };
      const data = await groupService.getMyGroups(req.user!.id, Number(page), Number(limit));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async discoverGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, q } = req.query as { page?: string; limit?: string; q?: string };
      const data = await groupService.discoverGroups(req.user!.id, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        q,
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.updateGroup(req.user!.id, String(req.params.id), req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupService.deleteGroup(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async joinGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupService.joinGroup(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async leaveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await groupService.leaveGroup(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async resetInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const link = await groupService.resetInviteLink(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data: { inviteLink: link } });
    } catch (err) {
      next(err);
    }
  }

  async joinByInviteLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.joinByInviteLink(req.user!.id, String(req.params.token));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // ——— Messages ———

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.sendMessage(req.user!.id, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as {
        channelId?: string;
        limit?: string;
        before?: string;
        after?: string;
      };
      const data = await groupService.getMessages(req.user!.id, {
        groupId: String(req.params.id),
        channelId: q.channelId,
        limit: q.limit ? Number(q.limit) : undefined,
        before: q.before,
        after: q.after,
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.editMessage(
        req.user!.id,
        String(req.params.messageId),
        req.body.content,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.deleteMessage(req.user!.id, String(req.params.messageId));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async reactToMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.reactToMessage(
        req.user!.id,
        String(req.params.messageId),
        req.body.emoji,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupId, lastMessageId } = req.body as { groupId: string; lastMessageId: string };
      await groupService.markRead(req.user!.id, groupId, lastMessageId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async getPinnedMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.getPinnedMessages(req.user!.id, String(req.params.id));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async pinMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await groupService.pinMessage(
        req.user!.id,
        String(req.params.messageId),
        req.body.pin,
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const groupController = new GroupController();
