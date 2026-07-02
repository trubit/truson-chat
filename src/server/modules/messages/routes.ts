import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { messageController } from './controller/index.js';
import {
  sendMessageSchema,
  editMessageSchema,
  reactSchema,
  messageQuerySchema,
  searchSchema,
  markReadSchema,
  markDeliveredSchema,
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

// IMPORTANT: /search must come BEFORE /:id so "search" is not captured as messageId

// GET /messages/search — search messages
router.get('/search', (_req, _res, next) => {
  try { validate(searchSchema, _req.query); next(); } catch (err) { next(err); }
}, messageController.searchMessages.bind(messageController));

// GET /messages — get messages for a conversation
router.get('/', (_req, _res, next) => {
  try { validate(messageQuerySchema, _req.query); next(); } catch (err) { next(err); }
}, messageController.getMessages.bind(messageController));

// POST /messages — send a message
router.post('/', (req, res, next) => {
  req.body = validate(sendMessageSchema, req.body);
  messageController.sendMessage(req, res, next);
});

// GET /messages/:id — get single message
router.get('/:id', messageController.getMessage.bind(messageController));

// PATCH /messages/:id — edit message
router.patch('/:id', (req, res, next) => {
  req.body = validate(editMessageSchema, req.body);
  messageController.editMessage(req, res, next);
});

// DELETE /messages/:id — delete message
router.delete('/:id', messageController.deleteMessage.bind(messageController));

// POST /messages/:id/react — toggle reaction
router.post('/:id/react', (req, res, next) => {
  req.body = validate(reactSchema, req.body);
  messageController.toggleReaction(req, res, next);
});

// POST /messages/:id/delivered — mark message delivered
router.post('/:id/delivered', (req, res, next) => {
  req.body = validate(markDeliveredSchema, req.body);
  messageController.markDelivered(req, res, next);
});

// POST /messages/:id/read — mark message read
router.post('/:id/read', (req, res, next) => {
  req.body = validate(markReadSchema, req.body);
  messageController.markRead(req, res, next);
});

export default router;
