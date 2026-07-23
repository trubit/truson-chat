import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { communityController } from './controller/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  handle: z
    .string()
    .regex(/^[a-z0-9_]{3,32}$/)
    .optional(),
  type: z.enum(['public', 'private']).default('public'),
  categories: z.array(z.string().max(50)).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  settings: z
    .object({
      joinApprovalRequired: z.boolean().optional(),
      invitePermission: z.enum(['everyone', 'admins']).optional(),
      discoverability: z.enum(['public', 'link_only', 'invite_only']).optional(),
    })
    .optional(),
});

const updateSchema = createSchema.partial();

const addGroupSchema = z.object({ groupId: z.string().min(1) });

const router = Router();
router.use(authenticate);

router.get('/discover', communityController.discoverCommunities.bind(communityController));
router.get('/me', communityController.getMyCommunities.bind(communityController));

router.post('/', (req, res, next) => {
  req.body = validate(createSchema, req.body);
  communityController.createCommunity(req, res, next);
});

router.get('/:id', communityController.getCommunity.bind(communityController));

router.patch('/:id', (req, res, next) => {
  req.body = validate(updateSchema, req.body);
  communityController.updateCommunity(req, res, next);
});

router.delete('/:id', communityController.deleteCommunity.bind(communityController));
router.post('/:id/join', communityController.joinCommunity.bind(communityController));
router.post('/:id/leave', communityController.leaveCommunity.bind(communityController));

router.post('/:id/groups', (req, res, next) => {
  req.body = validate(addGroupSchema, req.body);
  communityController.addGroup(req, res, next);
});

router.delete('/:id/groups/:groupId', communityController.removeGroup.bind(communityController));

export default router;
