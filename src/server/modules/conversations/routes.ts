import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { conversationController } from './controller/index.js';
import {
  createConversationSchema,
  muteConversationSchema,
  markReadSchema,
  listConversationsSchema,
} from './validator/index.js';

// ---------------------------------------------------------------------------
// Validate helper
// ---------------------------------------------------------------------------

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      result.error.issues[0]?.message ?? 'Validation error',
      400,
      'VALIDATION_ERROR',
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /conversations — get or create direct conversation
router.post('/', (req, res, next) => {
  req.body = validate(createConversationSchema, req.body);
  conversationController.getOrCreateDirect(req, res, next);
});

// GET /conversations — list conversations
router.get(
  '/',
  (req, _res, next) => {
    try {
      validate(listConversationsSchema, req.query);
      next();
    } catch (err) {
      next(err);
    }
  },
  conversationController.getConversations.bind(conversationController),
);

// GET /conversations/:id — get single conversation
router.get('/:id', conversationController.getConversation.bind(conversationController));

// POST /conversations/:id/archive
router.post('/:id/archive', conversationController.archive.bind(conversationController));

// POST /conversations/:id/unarchive
router.post('/:id/unarchive', conversationController.unarchive.bind(conversationController));

// POST /conversations/:id/pin
router.post('/:id/pin', conversationController.pin.bind(conversationController));

// POST /conversations/:id/unpin
router.post('/:id/unpin', conversationController.unpin.bind(conversationController));

// POST /conversations/:id/mute
router.post('/:id/mute', (req, res, next) => {
  req.body = validate(muteConversationSchema, req.body);
  conversationController.mute(req, res, next);
});

// POST /conversations/:id/unmute
router.post('/:id/unmute', conversationController.unmute.bind(conversationController));

// POST /conversations/:id/read
router.post('/:id/read', (req, res, next) => {
  req.body = validate(markReadSchema, req.body);
  conversationController.markRead(req, res, next);
});

// GET /conversations/:id/members
router.get('/:id/members', conversationController.getMembers.bind(conversationController));

export default router;
