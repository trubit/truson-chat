import type { Request, Response, NextFunction } from 'express';
import { gifService } from '../service/index.js';

class GifController {
  async getTrending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawLimit = parseInt((req.query['limit'] as string) ?? '20', 10);
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 50);
      const gifs = await gifService.getTrending(limit);
      res.json({ success: true, data: gifs });
    } catch (err) {
      next(err);
    }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = ((req.query['q'] as string) ?? '').trim();
      const rawLimit = parseInt((req.query['limit'] as string) ?? '20', 10);
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 50);
      const gifs = await gifService.search(q, limit);
      res.json({ success: true, data: gifs });
    } catch (err) {
      next(err);
    }
  }
}

export const gifController = new GifController();
