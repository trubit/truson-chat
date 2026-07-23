import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { channelController } from './controller/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const createSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['text', 'announcement', 'voice', 'stage']).default('text'),
  isPrivate: z.boolean().default(false),
  slowModeSeconds: z.number().int().min(0).max(21600).default(0),
  topic: z.string().max(1024).optional(),
  position: z.number().int().min(0).optional(),
});

const updateSchema = createSchema.partial().omit({ groupId: true });

const addMemberSchema = z.object({ userId: z.string().min(1) });

const router = Router();
router.use(authenticate);

// Standalone channel endpoints
router.get('/:id', channelController.getChannel.bind(channelController));

router.patch('/:id', (req, res, next) => {
  req.body = validate(updateSchema, req.body);
  channelController.updateChannel(req, res, next);
});

router.delete('/:id', channelController.deleteChannel.bind(channelController));

// Private channel members
router.post('/:id/members', (req, res, next) => {
  req.body = validate(addMemberSchema, req.body);
  channelController.addMember(req, res, next);
});

router.delete('/:id/members/:userId', channelController.removeMember.bind(channelController));

export default router;
