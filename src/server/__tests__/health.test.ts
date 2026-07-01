/**
 * Integration tests for the Express app — focuses on the /health endpoint
 * and basic routing behaviour (404, API router presence).
 *
 * Strategy:
 *  - Mock every module that creates long-lived connections at import time so
 *    the test process never dials a real socket.
 *  - Also mock modules that cause issues in the CommonJS Jest environment:
 *    - ../security/rateLimit: RedisStore.init() calls sendCommand which
 *      throws when ioredis-mock status !== 'ready'.
 *    - ../routes/index: Express 5 + path-to-regexp v8 rejects bare `*`
 *      wildcards in route files that haven't been updated yet.
 *  - jest.mock() calls are hoisted above imports by ts-jest, so the mocks are
 *    in place before `app.ts` evaluates at module level.
 *  - The app is imported once per file (module cache); supertest wraps it
 *    without starting an HTTP server.
 */

jest.mock('../queues/index', () => ({
  emailQueue: { close: jest.fn().mockResolvedValue(undefined) },
  notificationQueue: { close: jest.fn().mockResolvedValue(undefined) },
  mediaQueue: { close: jest.fn().mockResolvedValue(undefined) },
  cleanupQueue: { close: jest.fn().mockResolvedValue(undefined) },
  analyticsQueue: { close: jest.fn().mockResolvedValue(undefined) },
  auditQueue: { close: jest.fn().mockResolvedValue(undefined) },
  allQueues: [],
  closeAllQueues: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../sockets/server', () => ({
  setupSocketServer: jest.fn().mockResolvedValue({
    close: jest.fn(),
    of: jest.fn().mockReturnValue({ use: jest.fn(), on: jest.fn() }),
  }),
}));

jest.mock('../database/connection', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../redis/connection', () => ({
  // Provide a minimal stub so rateLimit.ts and other modules that import
  // redisClient at module level don't attempt real connections.
  redisClient: {
    status: 'ready',
    call: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    duplicate: jest.fn().mockReturnThis(),
  },
  connectRedis: jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../routes/index', () => {
  // Provide a minimal Express router stub so path-to-regexp wildcard issues
  // in individual route modules don't block app.ts from loading.
  const { Router } = require('express');
  const router = Router();
  router.get('/stub', (_req: unknown, res: { json: (v: unknown) => void }) => {
    res.json({ stub: true });
  });
  return { apiRouter: router };
});

import request from 'supertest';
import { app } from '../app';

// ---------------------------------------------------------------------------
// /health
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('responds with 200 and status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      env: 'test',
    });
  });

  it('response body includes uptime as a non-negative number', async () => {
    const res = await request(app).get('/health');

    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('response body includes a valid ISO timestamp', async () => {
    const before = Date.now();
    const res = await request(app).get('/health');
    const after = Date.now();

    expect(typeof res.body.timestamp).toBe('string');
    const ts = new Date(res.body.timestamp as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('response body includes version from APP_VERSION env var', async () => {
    const res = await request(app).get('/health');

    // APP_VERSION is set to '1.0.0-test' in test-utils/env.ts
    expect(res.body.version).toBe(process.env['APP_VERSION']);
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

describe('Unknown route', () => {
  it('returns 404 for a completely unknown path', async () => {
    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      code: 'NOT_FOUND',
    });
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 for an unknown POST route', async () => {
    const res = await request(app)
      .post('/no-such-endpoint')
      .send({ foo: 'bar' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// API router is mounted
// ---------------------------------------------------------------------------

describe('GET /api/v1', () => {
  it('does not return a 500 error (router is wired up)', async () => {
    // We are not testing any specific API route behaviour here — just that
    // the /api/v1 prefix is handled by the router and not swallowed by the
    // error handler as an unhandled crash.
    const res = await request(app).get('/api/v1');

    expect(res.status).not.toBe(500);
  });
});
