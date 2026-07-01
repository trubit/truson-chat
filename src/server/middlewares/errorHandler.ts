import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import jwt from 'jsonwebtoken';
const { JsonWebTokenError, TokenExpiredError, NotBeforeError } = jwt;
import { logger } from '../logger/index.js';
import type { ApiError } from '../../shared/types/index.js';

// ---------------------------------------------------------------------------
// AppError — known, intentional application errors
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function sendError(
  res: Response,
  statusCode: number,
  body: ApiError & { details?: Record<string, string[]> },
): void {
  res.status(statusCode).json(body);
}

// ---------------------------------------------------------------------------
// errorHandler — must be 4-argument for Express to treat it as error handler
// ---------------------------------------------------------------------------

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // ── Zod validation ────────────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const flat = err.flatten();
    const details: Record<string, string[]> = {
      ...flat.fieldErrors,
    } as Record<string, string[]>;
    if (flat.formErrors.length > 0) {
      details['_form'] = flat.formErrors;
    }

    logger.warn('Validation error', {
      path: req.path,
      method: req.method,
      details,
    });

    sendError(res, 422, {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    });
    return;
  }

  // ── Mongoose validation ───────────────────────────────────────────────────
  if (err instanceof MongooseError.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [field, validatorError] of Object.entries(err.errors)) {
      details[field] = [validatorError.message];
    }

    logger.warn('Mongoose validation error', {
      path: req.path,
      method: req.method,
      details,
    });

    sendError(res, 422, {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    });
    return;
  }

  // ── JWT errors ────────────────────────────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    sendError(res, 401, {
      success: false,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  if (err instanceof NotBeforeError) {
    sendError(res, 401, {
      success: false,
      error: 'Token not yet valid',
      code: 'TOKEN_NOT_BEFORE',
    });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    sendError(res, 401, {
      success: false,
      error: 'Invalid token',
      code: 'TOKEN_INVALID',
    });
    return;
  }

  // ── Known app errors ──────────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn('AppError', {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
      });
    }

    const body: ApiError = {
      success: false,
      error: err.message,
      code: err.code,
    };

    sendError(res, err.statusCode, body);
    return;
  }

  // ── Unknown / programming errors ──────────────────────────────────────────
  const unknownErr = err instanceof Error ? err : new Error(String(err));

  logger.error('Unhandled error', {
    message: unknownErr.message,
    stack: unknownErr.stack,
    path: req.path,
    method: req.method,
  });

  const body: ApiError = {
    success: false,
    error: isProduction() ? 'Internal server error' : unknownErr.message,
    code: 'INTERNAL_ERROR',
  };

  sendError(res, 500, body);
}
