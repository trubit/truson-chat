import rateLimit, { type Options as RateLimitOptions } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { RedisStore, type SendCommandFn } from 'rate-limit-redis';
import { redisClient } from '../redis/connection.js';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';

// --------------------------------------------------------------------------
// Redis store factory — sendCommand is lazy: checked per request, not at
// module-load time. This means the store works correctly even though the
// module is imported before connectRedis() is called in start().
// --------------------------------------------------------------------------

function buildRedisStore(prefix: string): RedisStore {
  const sendCommand: SendCommandFn = (...args: string[]) => {
    if (redisClient.status !== 'ready') {
      // Redis not yet connected. Return a resolved value so the store's init
      // (loadIncrementScript) completes silently instead of logging a noisy
      // async error. The `skip` function bypasses rate limiting in dev/test,
      // so this path is safe. In production Redis is required and will be
      // ready before any request arrives (start() throws if connectRedis fails).
      return Promise.resolve('') as ReturnType<SendCommandFn>;
    }
    return redisClient.call(args[0], ...args.slice(1)) as ReturnType<SendCommandFn>;
  };

  return new RedisStore({ sendCommand, prefix: `rl:${prefix}:` });
}

// --------------------------------------------------------------------------
// Shared rate-limit options
// --------------------------------------------------------------------------

function buildOptions(
  windowMs: number,
  max: number,
  prefix: string,
  message: string,
): Partial<RateLimitOptions> {
  const store = buildRedisStore(prefix);

  return {
    windowMs,
    max,
    store: store as RateLimitOptions['store'],
    standardHeaders: 'draft-7', // RateLimit-* headers (RFC draft 7)
    legacyHeaders: false,
    message: { success: false, error: message },
    skipSuccessfulRequests: false,
    handler: (_req, res, _next, options) => {
      logger.warn('Rate limit exceeded', {
        prefix,
        ip: _req.ip,
        path: _req.path,
        limit: options.max,
        windowMs: options.windowMs,
      });
      res.status(429).json(options.message);
    },
    skip: (req) => {
      // Never rate-limit in test or development
      if (process.env.NODE_ENV !== 'production') return true;
      // Skip health check endpoint
      if (req.path === '/health') return true;
      return false;
    },
  };
}

// --------------------------------------------------------------------------
// General rate limiter
// Uses RATE_LIMIT_WINDOW_MS + RATE_LIMIT_MAX_REQUESTS from env
// --------------------------------------------------------------------------

export function buildGeneralRateLimiter() {
  const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = getEnv();

  return rateLimit(
    buildOptions(
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS,
      'general',
      'Too many requests, please try again later.',
    ) as RateLimitOptions,
  );
}

// --------------------------------------------------------------------------
// Auth rate limiter
// Stricter window; limit comes from AUTH_RATE_LIMIT_MAX env var.
// In production the skip is removed so it always applies.
// In development/test the base skip (which skips non-production) is kept.
// --------------------------------------------------------------------------

export function buildAuthRateLimiter() {
  const { AUTH_RATE_LIMIT_MAX, NODE_ENV } = getEnv();
  const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 min

  const options = buildOptions(
    AUTH_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX,
    'auth',
    'Too many authentication attempts, please try again in 15 minutes.',
  );

  // In production: remove skip so the limiter is unconditional.
  // In development/test: keep the base skip so local testing is never blocked.
  if (NODE_ENV === 'production') {
    delete options.skip;
  }

  return rateLimit(options as RateLimitOptions);
}

// Singletons created at module load time so express-rate-limit doesn't
// raise ERR_ERL_CREATED_IN_REQUEST_HANDLER.  The Redis sendCommand is already
// lazy (checks redisClient.status at call time), so it's safe to build the
// store before connectRedis() is called.
export const generalRateLimiter: RequestHandler = buildGeneralRateLimiter();
export const authRateLimiter: RequestHandler = buildAuthRateLimiter();
