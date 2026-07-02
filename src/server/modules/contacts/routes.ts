import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validate.js';
import { ContactRepository } from './repository/index.js';
import { ContactsService } from './service/index.js';
import { ContactController } from './controller/index.js';
import {
  createContactSchema,
  updateContactSchema,
  contactListQuerySchema,
  contactSearchSchema,
  contactIdParamSchema,
  importPrepSchema,
} from './validator/index.js';

const router = Router();
const repo = new ContactRepository();
const service = new ContactsService(repo);
const controller = new ContactController(service);

// IMPORTANT: specific routes BEFORE parameterized routes
router.get('/', authenticate, validateQuery(contactListQuerySchema), controller.list);
router.post('/', authenticate, validateBody(createContactSchema), controller.create);
router.get('/search', authenticate, validateQuery(contactSearchSchema), controller.search);
router.get('/export', authenticate, controller.export);
router.post('/import/prepare', authenticate, validateBody(importPrepSchema), controller.importPrep);
router.get('/:contactId', authenticate, validateParams(contactIdParamSchema), controller.get);
router.patch(
  '/:contactId',
  authenticate,
  validateParams(contactIdParamSchema),
  validateBody(updateContactSchema),
  controller.update,
);
router.delete('/:contactId', authenticate, validateParams(contactIdParamSchema), controller.remove);
router.post(
  '/:contactId/favorite',
  authenticate,
  validateParams(contactIdParamSchema),
  controller.toggleFavorite,
);

export default router;
