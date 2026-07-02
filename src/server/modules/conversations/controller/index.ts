import type { Request, Response, NextFunction } from 'express';
import { conversationService } from '../service/index.js';

// ---------------------------------------------------------------------------
// ConversationController
// ---------------------------------------------------------------------------

export class ConversationController {
  async getOrCreateDirect(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { participantId } = req.body as { participantId: string };
      const data = await conversationService.getOrCreateDirect(userId, participantId);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getConversations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = req.query as {
        page?: string;
        limit?: string;
        archived?: string;
      };
      const data = await conversationService.getConversations(userId, {
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        archived: query.archived === 'true',
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getConversation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const data = await conversationService.getConversation(userId, id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      await conversationService.archiveConversation(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async unarchive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      await conversationService.unarchiveConversation(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async pin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      await conversationService.pinConversation(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async unpin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      await conversationService.unpinConversation(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async mute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const dto = req.body as { duration?: number };
      await conversationService.muteConversation(userId, id, dto);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async unmute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      await conversationService.unmuteConversation(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const { messageId } = req.body as { messageId: string };
      await conversationService.markRead(userId, id, messageId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const members = await conversationService.getMembers(userId, id);
      res.status(200).json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  }
}

export const conversationController = new ConversationController();
