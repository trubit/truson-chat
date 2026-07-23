import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { groupJoinRequestService } from './service/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const requestSchema = z.object({
  groupId: z.string().min(1),
  message: z.string().max(500).optional(),
});

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().max(500).optional(),
});

const router = Router();
router.use(authenticate);

// Send a join request
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = validate(requestSchema, req.body);
    const data = await groupJoinRequestService.requestToJoin(
      req.user!.id,
      req.body.groupId,
      req.body.message,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Get pending requests for a group
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      groupId,
      page = '1',
      limit = '20',
    } = req.query as { groupId: string; page?: string; limit?: string };
    if (!groupId) throw new AppError('groupId is required', 400, 'BAD_REQUEST');
    const data = await groupJoinRequestService.getPendingRequests(req.user!.id, groupId, {
      page: Number(page),
      limit: Number(limit),
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Review (approve/reject)
router.patch('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = validate(reviewSchema, req.body);
    const data = await groupJoinRequestService.reviewRequest(
      req.user!.id,
      String(req.params.id),
      body.action,
      body.rejectReason,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Cancel own request
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await groupJoinRequestService.cancelRequest(req.user!.id, String(req.params.id));
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
