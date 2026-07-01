import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable field rules
// ---------------------------------------------------------------------------

const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const OTP_REGEX = /^\d{6}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

/**
 * Password must be 8–128 characters and contain at least one uppercase letter,
 * one lowercase letter, one digit, and one special character.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((v) => /[A-Z]/.test(v), 'Password must contain at least one uppercase letter')
  .refine((v) => /[a-z]/.test(v), 'Password must contain at least one lowercase letter')
  .refine((v) => /[0-9]/.test(v), 'Password must contain at least one number')
  .refine(
    (v) => /[^A-Za-z0-9]/.test(v),
    'Password must contain at least one special character',
  );

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(USERNAME_REGEX, 'Username may only contain letters, digits, _, ., and -'),
  email: z.email('Invalid email address'),
  password: passwordSchema,
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be at most 50 characters'),
  phone: z
    .string()
    .regex(E164_REGEX, 'Phone must be in E.164 format (e.g. +15551234567)')
    .optional(),
});

export type RegisterSchema = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  deviceName: z.string().optional(),
  deviceType: z.enum(['mobile', 'desktop', 'tablet', 'other']).optional(),
  platform: z.string().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;

// ---------------------------------------------------------------------------
// Verify email
// ---------------------------------------------------------------------------

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>;

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// Send phone OTP
// ---------------------------------------------------------------------------

export const sendPhoneOtpSchema = z.object({
  phone: z.string().regex(E164_REGEX, 'Phone must be in E.164 format (e.g. +15551234567)'),
});

export type SendPhoneOtpSchema = z.infer<typeof sendPhoneOtpSchema>;

// ---------------------------------------------------------------------------
// Verify phone
// ---------------------------------------------------------------------------

export const verifyPhoneSchema = z.object({
  phone: z.string().regex(E164_REGEX, 'Phone must be in E.164 format (e.g. +15551234567)'),
  otp: z.string().regex(OTP_REGEX, 'OTP must be exactly 6 digits'),
});

export type VerifyPhoneSchema = z.infer<typeof verifyPhoneSchema>;
