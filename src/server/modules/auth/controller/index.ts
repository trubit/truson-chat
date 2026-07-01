import type { RequestHandler } from 'express';
import type { AuthService } from '../service/index.js';
import type {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  SendPhoneOtpSchema,
  VerifyPhoneSchema,
} from '../validator/index.js';

// ---------------------------------------------------------------------------
// Helper — extract client metadata from the request
// ---------------------------------------------------------------------------

function getIpAddress(req: Parameters<RequestHandler>[0]): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function getUserAgent(req: Parameters<RequestHandler>[0]): string {
  return (req.headers['user-agent'] as string | undefined) ?? 'unknown';
}

// ---------------------------------------------------------------------------
// AuthController
// ---------------------------------------------------------------------------

export class AuthController {
  constructor(private readonly service: AuthService) {
    // Bind all methods so they work as standalone Express handlers
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.refresh = this.refresh.bind(this);
    this.getMe = this.getMe.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.resendVerification = this.resendVerification.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.sendPhoneOtp = this.sendPhoneOtp.bind(this);
    this.verifyPhone = this.verifyPhone.bind(this);
  }

  // POST /auth/register → 201
  async register(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const body = req.body as RegisterSchema;
      const result = await this.service.register(body, getIpAddress(req), getUserAgent(req));
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/login → 200
  async login(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const body = req.body as LoginSchema;
      const result = await this.service.login(body, getIpAddress(req), getUserAgent(req));
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/logout → 200 (requires authenticate)
  async logout(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const user = req.user!;
      await this.service.logout(user.id, user.sessionId);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/refresh → 200
  async refresh(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenSchema;
      const result = await this.service.refreshTokens(refreshToken, getIpAddress(req));
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // GET /auth/me → 200 (requires authenticate)
  async getMe(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const user = req.user!;
      const result = await this.service.getMe(user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/verify-email → 201
  async verifyEmail(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const { token } = req.body as VerifyEmailSchema;
      await this.service.verifyEmail(token);
      res.status(201).json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/resend-verification → 200 (requires authenticate)
  async resendVerification(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const user = req.user!;
      await this.service.resendVerification(user.id, user.email);
      res.status(200).json({ success: true, message: 'Verification email sent' });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/forgot-password → 200
  async forgotPassword(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const { email } = req.body as ForgotPasswordSchema;
      await this.service.forgotPassword(email, getIpAddress(req));
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent',
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/reset-password → 200
  async resetPassword(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const { token, password } = req.body as ResetPasswordSchema;
      await this.service.resetPassword(token, password, getIpAddress(req));
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/change-password → 200 (requires authenticate)
  async changePassword(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const user = req.user!;
      const { currentPassword, newPassword } = req.body as ChangePasswordSchema;
      await this.service.changePassword(user.id, currentPassword, newPassword, getIpAddress(req));
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/send-phone-otp → 200 (requires authenticate)
  async sendPhoneOtp(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const user = req.user!;
      const { phone } = req.body as SendPhoneOtpSchema;
      await this.service.sendPhoneOtp(user.id, phone);
      res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/verify-phone → 200 (requires authenticate)
  async verifyPhone(
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2],
  ): Promise<void> {
    try {
      const user = req.user!;
      const { phone, otp } = req.body as VerifyPhoneSchema;
      await this.service.verifyPhone(user.id, phone, otp);
      res.status(200).json({ success: true, message: 'Phone verified successfully' });
    } catch (err) {
      next(err);
    }
  }
}
