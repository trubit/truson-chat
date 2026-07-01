import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { jwtService } from '../services/jwt.js';
import { UserModel } from '../database/models/User.js';
import { redisClient } from '../redis/connection.js';

// ---------------------------------------------------------------------------
// Augment Express.Request
// ---------------------------------------------------------------------------

export interface RequestUser {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'business';
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

// ---------------------------------------------------------------------------
// authenticate — required authentication
// ---------------------------------------------------------------------------

/**
 * Verifies the Bearer access token in the Authorization header and populates
 * req.user. Responds with 401 if the token is missing, invalid, or expired.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    return;
  }

  let payload;
  try {
    payload = jwtService.verifyAccessToken(token);
  } catch {
    // JsonWebTokenError, TokenExpiredError, NotBeforeError all map to 401
    next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
    return;
  }

  if (payload.type !== 'access') {
    next(new AppError('Invalid token type', 401, 'UNAUTHORIZED'));
    return;
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  };

  next();
}

// ---------------------------------------------------------------------------
// requireVerified — authentication + email verification check
// ---------------------------------------------------------------------------

const EMAIL_VERIFIED_CACHE_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Runs authenticate, then confirms the user's email is verified.
 * The result is cached in Redis for 5 minutes (keyed on userId) to avoid
 * a DB round-trip on every request.
 */
export async function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Re-use authenticate synchronously by wrapping it in a Promise
  await new Promise<void>((resolve, reject) => {
    authenticate(req, res, (err?: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch((err) => {
    next(err);
    return Promise.reject('done'); // signal to bail out
  });

  // If authenticate called next(err), we already forwarded it above
  if (!req.user) return;

  const userId = req.user.id;
  const cacheKey = `email_verified:${userId}`;

  try {
    // Check Redis cache first to avoid a DB hit on every authenticated request
    const cached = await redisClient.get(cacheKey);

    if (cached === '1') {
      // Cache hit — email is verified
      next();
      return;
    }

    if (cached === '0') {
      // Cache hit — email is NOT verified
      next(new AppError('Email address has not been verified', 403, 'EMAIL_NOT_VERIFIED'));
      return;
    }

    // Cache miss — query the database
    const user = await UserModel.findById(userId).select('emailVerified').lean();

    if (!user) {
      next(new AppError('User not found', 401, 'UNAUTHORIZED'));
      return;
    }

    // Persist result in Redis so subsequent requests skip the DB
    await redisClient.setex(cacheKey, EMAIL_VERIFIED_CACHE_TTL, user.emailVerified ? '1' : '0');

    if (!user.emailVerified) {
      next(new AppError('Email address has not been verified', 403, 'EMAIL_NOT_VERIFIED'));
      return;
    }

    next();
  } catch (err) {
    // Redis or DB failure — fail open to avoid blocking all authenticated traffic
    // (log the error; the DB fallback already ran before we got here when Redis missed)
    next(err);
  }
}

// ---------------------------------------------------------------------------
// optionalAuth — non-blocking authentication
// ---------------------------------------------------------------------------

/**
 * Attempts to verify the Bearer token but never blocks the request.
 * If the token is valid, req.user is populated; otherwise the request
 * proceeds with req.user undefined.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwtService.verifyAccessToken(token);

    if (payload.type === 'access') {
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId,
      };
    }
  } catch {
    // Invalid / expired token — silently ignore for optional auth
  }

  next();
}
