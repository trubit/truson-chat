import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { getEnv } from '../config/env.js';

// CJS-compat destructure (jsonwebtoken ships CommonJS)
const { sign, verify, decode } = jwt;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JwtPayload {
  sub: string; // userId as ObjectId string
  email: string;
  role: 'user' | 'admin' | 'business';
  sessionId: string; // Session ObjectId as string
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string; // raw token — caller must hash before storing
  expiresIn: number; // seconds until the access token expires
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a JWT expiry string (e.g. '15m', '7d', '1h', '30s') to seconds.
 * Falls back to parsing the value as a plain integer (already in seconds).
 */
function parseExpiresIn(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    const numeric = parseInt(value, 10);
    if (!Number.isNaN(numeric)) return numeric;
    throw new Error(`Invalid JWT expiry format: "${value}"`);
  }
  const amount = parseInt(match[1] as string, 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers: Record<typeof unit, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return amount * multipliers[unit];
}

// ---------------------------------------------------------------------------
// JWT Service
// ---------------------------------------------------------------------------

const jwtService = {
  /**
   * Issues an access + refresh token pair for an authenticated session.
   * The caller is responsible for hashing the raw refreshToken before persisting.
   */
  generateTokenPair(
    userId: string,
    email: string,
    role: 'user' | 'admin' | 'business',
    sessionId: string,
  ): TokenPair {
    const env = getEnv();

    const accessToken = sign(
      { sub: userId, email, role, sessionId, type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
    );

    const refreshToken = sign(
      { sub: userId, email, role, sessionId, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: parseExpiresIn(env.JWT_ACCESS_EXPIRES_IN),
    };
  },

  /**
   * Verifies an access token and returns its decoded payload.
   * Throws JsonWebTokenError / TokenExpiredError on failure.
   */
  verifyAccessToken(token: string): JwtPayload {
    const env = getEnv();
    return verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  },

  /**
   * Verifies a refresh token and returns its decoded payload.
   * Throws JsonWebTokenError / TokenExpiredError on failure.
   */
  verifyRefreshToken(token: string): JwtPayload {
    const env = getEnv();
    return verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  },

  /**
   * Returns a SHA-256 hex digest of the token.
   * Use this to produce the value stored in the DB (tokenHash fields).
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  },

  /**
   * Decodes a token without verifying its signature or expiry.
   * Useful for reading claims from an expired token (e.g. to identify a session).
   * Returns null if the token cannot be decoded at all.
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return decode(token) as JwtPayload | null;
    } catch {
      return null;
    }
  },

  parseExpiresIn,
};

export { jwtService };
