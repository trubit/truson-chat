import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validateBody, validateQuery, validateParams } from '../../middlewares/validate.js';
import { UsersRepository } from './repository/index.js';
import { UsersService } from './service/index.js';
import { UsersController } from './controller/index.js';
import {
  userListQuerySchema,
  updateUserSchema,
  userIdParamSchema,
  updateStatusSchema,
} from './validator/index.js';

const router = Router();

const repo = new UsersRepository();
const service = new UsersService(repo);
const controller = new UsersController(service);

// GET /users/search — must be before /:id to avoid route conflict
router.get(
  '/search',
  authenticate,
  controller.searchUsers,
);

// GET /users — admin only
router.get(
  '/',
  authenticate,
  authorize('admin'),
  validateQuery(userListQuerySchema),
  controller.listUsers,
);

// GET /users/:id
router.get(
  '/:id',
  authenticate,
  validateParams(userIdParamSchema),
  controller.getUser,
);

// PATCH /users/:id
router.patch(
  '/:id',
  authenticate,
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  controller.updateUser,
);

// DELETE /users/:id
router.delete(
  '/:id',
  authenticate,
  validateParams(userIdParamSchema),
  controller.deleteUser,
);

// PATCH /users/:id/status — admin only
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validateParams(userIdParamSchema),
  validateBody(updateStatusSchema),
  controller.updateStatus,
);

export default router;
