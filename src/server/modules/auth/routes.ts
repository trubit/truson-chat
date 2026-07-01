import { Router } from 'express';
import { AuthController } from './controller/index.js';
import { AuthService } from './service/index.js';
import { AuthRepository } from './repository/index.js';
import { validateBody } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  sendPhoneOtpSchema,
  verifyPhoneSchema,
} from './validator/index.js';

const router = Router();
const controller = new AuthController(new AuthService(new AuthRepository()));

// ── Public routes ──────────────────────────────────────────────────────────

router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(loginSchema), controller.login);
router.post('/refresh', validateBody(refreshTokenSchema), controller.refresh);
router.post('/verify-email', validateBody(verifyEmailSchema), controller.verifyEmail);
router.post('/forgot-password', validateBody(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), controller.resetPassword);

// ── Protected routes (require auth) ───────────────────────────────────────

router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.getMe);
router.post('/resend-verification', authenticate, controller.resendVerification);
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword,
);
router.post(
  '/send-phone-otp',
  authenticate,
  validateBody(sendPhoneOtpSchema),
  controller.sendPhoneOtp,
);
router.post(
  '/verify-phone',
  authenticate,
  validateBody(verifyPhoneSchema),
  controller.verifyPhone,
);

export default router;
