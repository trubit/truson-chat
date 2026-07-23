import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { groupController } from './controller/index.js';
import {
  createGroupSchema,
  updateGroupSchema,
  groupQuerySchema,
  sendGroupMessageSchema,
  editGroupMessageSchema,
  reactGroupMessageSchema,
  groupMessageQuerySchema,
  markGroupReadSchema,
  pinMessageSchema,
} from './validator/index.js';

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new AppError(r.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
  return r.data;
}

const router = Router();
router.use(authenticate);

// Group discovery & my groups
router.get(
  '/discover',
  (req, _res, next) => {
    try {
      validate(groupQuerySchema, req.query);
      next();
    } catch (e) {
      next(e);
    }
  },
  groupController.discoverGroups.bind(groupController),
);

router.get('/me', groupController.getMyGroups.bind(groupController));

// Join via invite link (no :id — uses token)
router.post('/invite/:token/join', groupController.joinByInviteLink.bind(groupController));

// Messages — read mark
router.post('/messages/read', (req, res, next) => {
  req.body = validate(markGroupReadSchema, req.body);
  groupController.markRead(req, res, next);
});

// CRUD
router.post('/', (req, res, next) => {
  req.body = validate(createGroupSchema, req.body);
  groupController.createGroup(req, res, next);
});

router.get('/:id', groupController.getGroup.bind(groupController));

router.patch('/:id', (req, res, next) => {
  req.body = validate(updateGroupSchema, req.body);
  groupController.updateGroup(req, res, next);
});

router.delete('/:id', groupController.deleteGroup.bind(groupController));

// Membership
router.post('/:id/join', groupController.joinGroup.bind(groupController));
router.post('/:id/leave', groupController.leaveGroup.bind(groupController));
router.post('/:id/invite-link/reset', groupController.resetInviteLink.bind(groupController));

// Messages
router.get(
  '/:id/messages',
  (req, _res, next) => {
    try {
      validate(groupMessageQuerySchema, { ...req.query, groupId: String(req.params.id) });
      next();
    } catch (e) {
      next(e);
    }
  },
  groupController.getMessages.bind(groupController),
);

router.post('/:id/messages', (req, res, next) => {
  req.body = validate(sendGroupMessageSchema, { ...req.body, groupId: String(req.params.id) });
  groupController.sendMessage(req, res, next);
});

// Pinned messages
router.get('/:id/messages/pinned', groupController.getPinnedMessages.bind(groupController));

// Per-message ops
router.patch('/:id/messages/:messageId', (req, res, next) => {
  req.body = validate(editGroupMessageSchema, req.body);
  groupController.editMessage(req, res, next);
});

router.delete('/:id/messages/:messageId', groupController.deleteMessage.bind(groupController));

router.post('/:id/messages/:messageId/react', (req, res, next) => {
  req.body = validate(reactGroupMessageSchema, req.body);
  groupController.reactToMessage(req, res, next);
});

router.patch('/:id/messages/:messageId/pin', (req, res, next) => {
  req.body = validate(pinMessageSchema, req.body);
  groupController.pinMessage(req, res, next);
});

export default router;
