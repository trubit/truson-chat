import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  APP_VERSION: z.string().default('1.0.0'),
  CLIENT_URL: z.string().url(),

  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().default('truson_chat'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_DB: z.coerce.number().int().default(0),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE_MS: z.coerce.number().int().default(604800000),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  TENOR_API_KEY: z.string().optional(),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default(false),
  SMTP_USER: z.union([z.email(), z.literal('')]).default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('Linkora'),
  SMTP_FROM_EMAIL: z.union([z.email(), z.literal('')]).default(''),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().default(100),

  MAX_FILE_SIZE_BYTES: z.coerce.number().int().default(52428800),
  UPLOAD_DIR: z.string().default('./uploads'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_FILE_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default(false),
  LOG_DIR: z.string().default('./logs'),

  COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default(false),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(10),
  ADMIN_EMAIL: z.union([z.string().email(), z.literal('')]).default(''),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().default(10),
  PASSWORD_RESET_EXPIRY_MINUTES: z.coerce.number().int().default(30),
  EMAIL_VERIFY_EXPIRY_HOURS: z.coerce.number().int().default(24),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  _env = result.data;
  return _env;
}
