import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middlewares/authenticate.js';
import { validateBody, validateParams } from '../../middlewares/validate.js';
import { imageUpload } from '../../uploads/multer.js';
import { ProfileRepository } from './repository/index.js';
import { ProfileService } from './service/index.js';
import { ProfileController } from './controller/index.js';
import {
  updateProfileSchema,
  updatePrivacySchema,
  userIdParamSchema,
  updatePreferencesSchema,
} from './validator/index.js';

const router = Router();

const repo = new ProfileRepository();
const service = new ProfileService(repo);
const controller = new ProfileController(service);

// GET /profile/me — must be before /:userId to avoid route conflict
router.get('/me', authenticate, controller.getOwnProfile);

// GET /profile/preferences
router.get('/preferences', authenticate, controller.getPreferences);

// PATCH /profile
router.patch(
  '/',
  authenticate,
  validateBody(updateProfileSchema),
  controller.updateProfile,
);

// POST /profile/avatar — multer single 'avatar'
router.post(
  '/avatar',
  authenticate,
  imageUpload.single('avatar'),
  controller.uploadAvatar,
);

// DELETE /profile/avatar
router.delete('/avatar', authenticate, controller.removeAvatar);

// POST /profile/cover — multer single 'cover'
router.post(
  '/cover',
  authenticate,
  imageUpload.single('cover'),
  controller.uploadCoverImage,
);

// DELETE /profile/cover
router.delete('/cover', authenticate, controller.removeCoverImage);

// PATCH /profile/privacy
router.patch(
  '/privacy',
  authenticate,
  validateBody(updatePrivacySchema),
  controller.updatePrivacy,
);

// PATCH /profile/preferences
router.patch(
  '/preferences',
  authenticate,
  validateBody(updatePreferencesSchema),
  controller.updatePreferences,
);

// GET /profile/:userId — optionalAuth (public profile, respects privacy settings)
router.get(
  '/:userId',
  optionalAuth,
  validateParams(userIdParamSchema),
  controller.getProfile,
);

export default router;
