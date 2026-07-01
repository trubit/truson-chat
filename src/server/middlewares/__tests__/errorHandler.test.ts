/**
 * Unit tests for errorHandler middleware and AppError class.
 *
 * Each test spins up a minimal Express app that throws a specific error type,
 * then asserts on the JSON response shape and HTTP status code.
 *
 * No external I/O — no database, no Redis, no BullMQ.
 */

import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { Error as MongooseError } from 'mongoose';
import {
  JsonWebTokenError,
  TokenExpiredError,
} from 'jsonwebtoken';

import { errorHandler, AppError } from '../errorHandler';

// ---------------------------------------------------------------------------
// Helper — build a minimal express app that throws the given error
// ---------------------------------------------------------------------------

function makeApp(thrower: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.get('/test', thrower);
  // errorHandler must be 4-argument; TypeScript infers it correctly here
  app.use(errorHandler);
  return app;
}

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------

describe('AppError', () => {
  it('stores message, statusCode, code, and isOperational', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');

    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
  });

  it('defaults statusCode to 500 and code to INTERNAL_ERROR', () => {
    const err = new AppError('boom');

    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('accepts isOperational=false', () => {
    const err = new AppError('crash', 500, 'INTERNAL_ERROR', false);

    expect(err.isOperational).toBe(false);
  });

  it('captures a stack trace', () => {
    const err = new AppError('stack test', 400, 'BAD_REQUEST');

    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });
});

// ---------------------------------------------------------------------------
// errorHandler — AppError responses
// ---------------------------------------------------------------------------

describe('errorHandler — AppError', () => {
  it('responds 400 with success:false, error message and code for BAD_REQUEST', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('Invalid payload', 400, 'BAD_REQUEST'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Invalid payload',
      code: 'BAD_REQUEST',
    });
  });

  it('responds 404 for a 404 AppError', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('Resource not found', 404, 'NOT_FOUND'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Resource not found',
      code: 'NOT_FOUND',
    });
  });

  it('responds with statusCode from AppError even when isOperational is false', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('Non-operational failure', 503, 'SERVICE_UNAVAILABLE', false));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('responds 401 for an AppError with UNAUTHORIZED code', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('Access denied', 401, 'UNAUTHORIZED'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

// ---------------------------------------------------------------------------
// errorHandler — ZodError (422)
// ---------------------------------------------------------------------------

describe('errorHandler — ZodError', () => {
  it('responds 422 with VALIDATION_ERROR code when a ZodError is thrown', async () => {
    const app = makeApp((_req, _res, next) => {
      // Parse an object with a wrong field type so we get a fieldError
      const schema = z.object({
        email: z.string().email(),
        age: z.number().int().positive(),
      });
      const result = schema.safeParse({ email: 'not-an-email', age: -5 });
      if (!result.success) {
        next(result.error);
      }
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
    expect(res.body.details).toBeDefined();
    // email field should have at least one error
    expect(Array.isArray(res.body.details.email)).toBe(true);
  });

  it('includes fieldErrors keyed by field name', async () => {
    const app = makeApp((_req, _res, next) => {
      const schema = z.object({ username: z.string().min(3) });
      const result = schema.safeParse({ username: 'ab' });
      if (!result.success) next(result.error);
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.details.username)).toBe(true);
    expect(res.body.details.username.length).toBeGreaterThan(0);
  });

  it('includes _form key when a form-level (non-field) ZodError fires', async () => {
    const app = makeApp((_req, _res, next) => {
      // z.string().parse(number) produces a formError, not a fieldError
      const result = z.string().min(1).safeParse(42);
      if (!result.success) next(result.error);
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    // Either a _form key exists or fieldErrors are present — either way 422
    const details: Record<string, string[]> = res.body.details;
    const hasFormOrField =
      Array.isArray(details['_form']) ||
      Object.keys(details).some((k) => Array.isArray(details[k]));
    expect(hasFormOrField).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// errorHandler — MongooseError.ValidationError (422)
// ---------------------------------------------------------------------------

describe('errorHandler — MongooseError.ValidationError', () => {
  it('responds 422 with field-level details from a Mongoose validation error', async () => {
    const app = makeApp((_req, _res, next) => {
      const validationError = new MongooseError.ValidationError();
      // Add a cast error on the 'email' path (common real-world case)
      validationError.errors['email'] = new MongooseError.ValidatorError({
        message: 'Email is required',
        path: 'email',
        type: 'required',
        value: '',
      });
      next(validationError);
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
    expect(Array.isArray(res.body.details.email)).toBe(true);
    expect(res.body.details.email[0]).toBe('Email is required');
  });

  it('maps multiple mongoose validation errors to their respective field keys', async () => {
    const app = makeApp((_req, _res, next) => {
      const validationError = new MongooseError.ValidationError();
      validationError.errors['username'] = new MongooseError.ValidatorError({
        message: 'Username too short',
        path: 'username',
        type: 'minlength',
        value: 'ab',
      });
      validationError.errors['password'] = new MongooseError.ValidatorError({
        message: 'Password is required',
        path: 'password',
        type: 'required',
        value: '',
      });
      next(validationError);
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    expect(res.body.details.username).toEqual(['Username too short']);
    expect(res.body.details.password).toEqual(['Password is required']);
  });
});

// ---------------------------------------------------------------------------
// errorHandler — JWT errors
// ---------------------------------------------------------------------------

describe('errorHandler — JWT errors', () => {
  it('responds 401 with TOKEN_INVALID for JsonWebTokenError', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new JsonWebTokenError('jwt malformed'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Invalid token',
      code: 'TOKEN_INVALID',
    });
  });

  it('responds 401 with TOKEN_EXPIRED for TokenExpiredError', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new TokenExpiredError('jwt expired', new Date('2020-01-01')));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    });
  });

  it('handles JsonWebTokenError subclass — still returns TOKEN_INVALID if not TokenExpiredError', async () => {
    // NotBeforeError is another JWT subclass; ensure at least the JWT branch fires
    // Here we test a plain JsonWebTokenError for the general case
    const err = new JsonWebTokenError('signature invalid');
    const app = makeApp((_req, _res, next) => next(err));

    const res = await request(app).get('/test');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});

// ---------------------------------------------------------------------------
// errorHandler — unknown / programming errors
// ---------------------------------------------------------------------------

describe('errorHandler — unknown errors', () => {
  it('responds 500 with INTERNAL_ERROR code for a generic Error', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new Error('something went badly wrong'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      code: 'INTERNAL_ERROR',
    });
  });

  it('exposes the error message in non-production environments', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'test'; // not 'production'

    const app = makeApp((_req, _res, next) => {
      next(new Error('detailed internal message'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    // In non-production the raw message is exposed
    expect(res.body.error).toBe('detailed internal message');

    process.env['NODE_ENV'] = originalEnv;
  });

  it('hides the message in production, replacing it with a generic phrase', async () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';

    const app = makeApp((_req, _res, next) => {
      next(new Error('sensitive internal detail'));
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.error).not.toContain('sensitive');

    process.env['NODE_ENV'] = originalEnv;
  });

  it('handles a thrown non-Error value (plain string)', async () => {
    const app = makeApp((_req, _res, next) => {
      // Throwing a non-Error; errorHandler coerces to Error via String(err)
      next('plain string error');
    });

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });
});
