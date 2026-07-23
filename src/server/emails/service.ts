import nodemailer, { type Transporter, type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';
import { withRetry, withTimeout, CircuitBreaker } from '../utils/resilience.js';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: SendMailOptions['attachments'];
}

interface EmailService {
  send(options: SendEmailOptions): Promise<void>;
  sendWelcome(to: string, name: string): Promise<void>;
  sendPasswordReset(
    to: string,
    name: string,
    resetUrl: string,
    expiresInMinutes: number,
  ): Promise<void>;
  sendVerification(to: string, name: string, verificationUrl: string): Promise<void>;
  send2FACode(to: string, name: string, code: string, expiresInMinutes: number): Promise<void>;
}

// --------------------------------------------------------------------------
// Transporter factory
// --------------------------------------------------------------------------

function createTransporter(): Transporter {
  const env = getEnv();

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10,
    family: 4,
    tls: {
      rejectUnauthorized: env.NODE_ENV === 'production',
    },
  } as SMTPTransport.Options);
}

// --------------------------------------------------------------------------
// HTML safety helpers — prevent injection in email templates
// --------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return escapeHtml(trimmed);
  }
  return '#';
}

// --------------------------------------------------------------------------
// Base HTML layout
// --------------------------------------------------------------------------

function htmlLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .header { background: #4f46e5; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: .5px; }
    .body { padding: 40px; }
    .body p { line-height: 1.7; margin: 0 0 16px; font-size: 15px; color: #3f3f46; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .code-block { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; text-align: center; padding: 24px; background: #eef2ff; border-radius: 8px; margin: 24px 0; }
    .footer { background: #f4f4f5; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #71717a; margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Linkora</h1></div>
    <div class="body">${bodyContent}</div>
    <div class="footer">
      <p>You received this email because you have an account with Linkora.<br/>
      If you did not request this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// Email template builders
// --------------------------------------------------------------------------

export function welcomeEmail(name: string): { subject: string; html: string; text: string } {
  const subject = 'Welcome to Linkora!';
  const safeName = escapeHtml(name);
  const html = htmlLayout(
    subject,
    `<p>Hi ${safeName},</p>
     <p>Welcome to <strong>Linkora</strong> — your all-in-one communication platform. We're thrilled to have you on board.</p>
     <p>You can now start messaging, join groups, share media, and more.</p>
     <p>If you have any questions, our support team is always here to help.</p>
     <p>See you inside,<br/><strong>The Linkora Team</strong></p>`,
  );
  const text = `Hi ${name},\n\nWelcome to Linkora! We're thrilled to have you on board.\n\nThe Linkora Team`;
  return { subject, html, text };
}

export function passwordResetEmail(
  name: string,
  resetUrl: string,
  expiresInMinutes: number,
): { subject: string; html: string; text: string } {
  const subject = 'Reset your Linkora password';
  const safeName = escapeHtml(name);
  const safeResetUrl = safeUrl(resetUrl);
  const html = htmlLayout(
    subject,
    `<p>Hi ${safeName},</p>
     <p>We received a request to reset your password. Click the button below to choose a new one:</p>
     <p style="text-align:center"><a class="btn" href="${safeResetUrl}">Reset Password</a></p>
     <p>This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
     <p>If you did not request a password reset, no action is needed — your password will remain unchanged.</p>`,
  );
  const text = `Hi ${name},\n\nReset your password here: ${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes.\n\nIf you did not request this, ignore this email.`;
  return { subject, html, text };
}

export function emailVerificationEmail(
  name: string,
  verificationUrl: string,
): { subject: string; html: string; text: string } {
  const subject = 'Verify your Linkora email address';
  const safeName = escapeHtml(name);
  const safeVerificationUrl = safeUrl(verificationUrl);
  const html = htmlLayout(
    subject,
    `<p>Hi ${safeName},</p>
     <p>Thanks for signing up! Please verify your email address to activate your account:</p>
     <p style="text-align:center"><a class="btn" href="${safeVerificationUrl}">Verify Email</a></p>
     <p>If the button doesn't work, copy and paste this link into your browser:</p>
     <p style="word-break:break-all;font-size:13px;color:#6366f1">${safeVerificationUrl}</p>`,
  );
  const text = `Hi ${name},\n\nVerify your email here: ${verificationUrl}\n\nIf you did not create an account, ignore this email.`;
  return { subject, html, text };
}

export function twoFactorEmail(
  name: string,
  code: string,
  expiresInMinutes: number,
): { subject: string; html: string; text: string } {
  const subject = 'Your Linkora verification code';
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const html = htmlLayout(
    subject,
    `<p>Hi ${safeName},</p>
     <p>Use the following code to complete your sign-in. This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
     <div class="code-block">${safeCode}</div>
     <p>Never share this code with anyone. Linkora will never ask for it.</p>`,
  );
  const text = `Hi ${name},\n\nYour 2FA code is: ${code}\n\nExpires in ${expiresInMinutes} minutes. Never share this code.`;
  return { subject, html, text };
}

// --------------------------------------------------------------------------
// Email service implementation
// --------------------------------------------------------------------------

// SMTP permanent-failure codes — no point retrying these
const PERMANENT_SMTP_CODES = ['550', '551', '552', '553', '554'];

function isTransientSmtpError(err: Error): boolean {
  return !PERMANENT_SMTP_CODES.some((code) => err.message.includes(code));
}

class EmailServiceImpl implements EmailService {
  private transporter: Transporter;
  private fromAddress: string;
  private readonly circuitBreaker = new CircuitBreaker('smtp', {
    failureThreshold: 5,
    successThreshold: 2,
    halfOpenTimeMs: 60_000,
  });

  constructor() {
    this.transporter = createTransporter();
    const env = getEnv();
    this.fromAddress = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`;
  }

  /** Verify SMTP connection. Call this at server startup. */
  async verify(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified', { from: this.fromAddress });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('SMTP connection verification failed', { error: error.message });
      throw error;
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    const { to, subject, html, text, replyTo, attachments } = options;

    const mailOptions: SendMailOptions = {
      from: this.fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text ?? '',
      replyTo,
      attachments,
    };

    try {
      const info = await this.circuitBreaker.execute(() =>
        withRetry(
          () =>
            withTimeout(
              () => this.transporter.sendMail(mailOptions),
              15_000,
              'SMTP send timed out',
            ),
          {
            maxAttempts: 3,
            baseDelayMs: 500,
            maxDelayMs: 10_000,
            jitter: 'full',
            shouldRetry: isTransientSmtpError,
            onRetry: (attempt, err, delayMs) => {
              logger.warn('Email send retry', {
                attempt,
                error: err.message,
                delayMs,
                to: mailOptions.to,
                subject,
              });
            },
          },
        ),
      );
      logger.info('Email sent', {
        to: mailOptions.to,
        subject,
        messageId: info.messageId as string,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Email send failed', {
        to: mailOptions.to,
        subject,
        error: error.message,
      });
      throw error;
    }
  }

  async sendWelcome(to: string, name: string): Promise<void> {
    const template = welcomeEmail(name);
    await this.send({ to, ...template });
  }

  async sendPasswordReset(
    to: string,
    name: string,
    resetUrl: string,
    expiresInMinutes = 30,
  ): Promise<void> {
    const template = passwordResetEmail(name, resetUrl, expiresInMinutes);
    await this.send({ to, ...template });
  }

  async sendVerification(to: string, name: string, verificationUrl: string): Promise<void> {
    const template = emailVerificationEmail(name, verificationUrl);
    await this.send({ to, ...template });
  }

  async send2FACode(to: string, name: string, code: string, expiresInMinutes = 10): Promise<void> {
    const template = twoFactorEmail(name, code, expiresInMinutes);
    await this.send({ to, ...template });
  }
}

// --------------------------------------------------------------------------
// Singleton export
// --------------------------------------------------------------------------

export const emailService: EmailService & { verify(): Promise<void> } = new EmailServiceImpl();
