import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { groupMemberController } from './controller/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const roleSchema = z.object({ role: z.enum(['owner', 'admin', 'moderator', 'member', 'guest']) });
const banSchema = z.object({
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});
const muteSchema = z.object({ expiresAt: z.string().datetime().optional() });

// Mounted at /groups/:id/members by the parent router
const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', groupMemberController.getMembers.bind(groupMemberController));
router.post('/:userId', groupMemberController.addMember.bind(groupMemberController));
router.get('/banned', groupMemberController.getBannedMembers.bind(groupMemberController));

router.patch('/:userId/role', (req, res, next) => {
  req.body = validate(roleSchema, req.body);
  groupMemberController.updateRole(req, res, next);
});

router.delete('/:userId', groupMemberController.kickMember.bind(groupMemberController));

router.post('/:userId/ban', (req, res, next) => {
  req.body = validate(banSchema, req.body);
  groupMemberController.banMember(req, res, next);
});

router.delete('/:userId/ban', groupMemberController.liftBan.bind(groupMemberController));

router.post('/:userId/mute', (req, res, next) => {
  req.body = validate(muteSchema, req.body);
  groupMemberController.muteMember(req, res, next);
});

router.delete('/:userId/mute', groupMemberController.unmuteMember.bind(groupMemberController));

export default router;
