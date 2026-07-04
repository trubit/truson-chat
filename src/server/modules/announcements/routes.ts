import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { announcementService } from './service/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const createSchema = z.object({
  scope:        z.enum(['group', 'community', 'channel']),
  groupId:      z.string().optional(),
  communityId:  z.string().optional(),
  channelId:    z.string().optional(),
  title:        z.string().min(1).max(200),
  content:      z.string().min(1).max(20_000),
  isPinned:     z.boolean().optional(),
  scheduledAt:  z.string().datetime().optional(),
  expiresAt:    z.string().datetime().optional(),
});

const updateSchema = createSchema.partial();

const querySchema = z.object({
  scope:        z.enum(['group', 'community', 'channel']),
  groupId:      z.string().optional(),
  communityId:  z.string().optional(),
  channelId:    z.string().optional(),
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().positive().max(50).default(20),
});

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = validate(querySchema, req.query);
    const data = await announcementService.getAnnouncements(req.user!.id, q);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = validate(createSchema, req.body);
    const data = await announcementService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = validate(updateSchema, req.body);
    const data = await announcementService.update(req.user!.id, String(req.params.id), req.body);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await announcementService.delete(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
});

export default router;
