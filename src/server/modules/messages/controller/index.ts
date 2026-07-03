import type { Request, Response, NextFunction } from 'express';
import { messageService } from '../service/index.js';

// ---------------------------------------------------------------------------
// MessageController
// ---------------------------------------------------------------------------

export class MessageController {
  async getMessages(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = req.query as {
        conversationId: string;
        limit?: string;
        before?: string;
        after?: string;
      };
      const data = await messageService.getMessages(userId, query.conversationId, {
        conversationId: query.conversationId,
        limit: query.limit ? Number(query.limit) : undefined,
        before: query.before,
        after: query.after,
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const dto = req.body as {
        conversationId: string;
        type: string;
        content: string;
        replyTo?: string;
        mentions?: string[];
        media?: import('../../../database/models/Message.js').IMessageMedia[];
      };
      const data = await messageService.sendMessage(userId, {
        conversationId: dto.conversationId,
        type: dto.type as import('../types/index.js').MsgTypeValues,
        content: dto.content,
        replyTo: dto.replyTo,
        mentions: dto.mentions,
        media: dto.media,
      });
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const data = await messageService.getMessage(userId, id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async editMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const dto = req.body as { content: string };
      const data = await messageService.editMessage(userId, id, dto);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const data = await messageService.deleteMessage(userId, id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async toggleReaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;
      const dto = req.body as { emoji: string };
      const data = await messageService.toggleReaction(userId, id, dto);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async markDelivered(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { conversationId } = req.body as { conversationId: string };
      await messageService.markDelivered(userId, conversationId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async markRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { conversationId, messageId } = req.body as {
        conversationId: string;
        messageId: string;
      };
      await messageService.markRead(userId, conversationId, messageId);
      res.status(200).json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  }

  async searchMessages(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const query = req.query as {
        q: string;
        conversationId?: string;
        page?: string;
        limit?: string;
      };
      const data = await messageService.searchMessages(userId, {
        q: query.q,
        conversationId: query.conversationId,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const messageController = new MessageController();
