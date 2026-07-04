import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { groupInvitationService } from './service/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const createSchema = z.object({
  groupId:   z.string().min(1),
  type:      z.enum(['link', 'direct']),
  inviteeId: z.string().optional(),
  maxUses:   z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

const router = Router();
router.use(authenticate);

// Accept by token (public — still requires auth)
router.post('/accept/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await groupInvitationService.acceptInvite(req.user!.id, String(req.params.token));
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
});

// Create
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = validate(createSchema, req.body);
    const data = await groupInvitationService.createInvite(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

// List invites for a group
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.query as { groupId: string };
    if (!groupId) throw new AppError('groupId is required', 400, 'BAD_REQUEST');
    const data = await groupInvitationService.getInvites(req.user!.id, groupId);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
});

// Revoke
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await groupInvitationService.revokeInvite(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: null });
  } catch (err) { next(err); }
});

export default router;
