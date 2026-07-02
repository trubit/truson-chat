import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateQuery } from '../../middlewares/validate.js';
import { DiscoveryRepository } from './repository/index.js';
import { DiscoveryService } from './service/index.js';
import { DiscoveryController } from './controller/index.js';
import { searchQuerySchema, suggestionQuerySchema } from './validator/index.js';

const router = Router();

const repo = new DiscoveryRepository();
const service = new DiscoveryService(repo);
const controller = new DiscoveryController(service);

router.get('/search', authenticate, validateQuery(searchQuerySchema), controller.search);
router.get(
  '/suggestions',
  authenticate,
  validateQuery(suggestionQuerySchema),
  controller.suggestions,
);
router.get('/recent', authenticate, controller.recentSearches);
router.delete('/recent', authenticate, controller.clearRecentSearches);

export default router;
