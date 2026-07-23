/**
 * Unit tests for the validate middleware factory (and its aliases
 * validateBody, validateQuery, validateParams).
 *
 * Each test builds a minimal Express app with the validate middleware
 * in the pipeline, then asserts on response shape via supertest.
 * The errorHandler is included so that ZodErrors produce 422 responses
 * in the same way as production.
 */

import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { z, type ZodTypeAny } from 'zod';

import { validate, validateBody, validateQuery, validateParams } from '../validate';
import { errorHandler } from '../errorHandler';

// ---------------------------------------------------------------------------
// Helper — build a test app
// ---------------------------------------------------------------------------

function makeApp(schema: ZodTypeAny, target: 'body' | 'query' | 'params' = 'body') {
  const app = express();
  app.use(express.json());

  // For params tests we need a route with a named segment
  if (target === 'params') {
    app.post('/test/:id', validate(schema, 'params'), (req, res) => {
      res.json({ parsed: req.params });
    });
  } else {
    app.post('/test', validate(schema, target), ((req, res) => {
      // Cast to any so TypeScript doesn't complain about dynamic key access
      res.json({ parsed: (req as unknown as Record<string, unknown>)[target] });
    }) as RequestHandler);
  }

  app.use(errorHandler);
  return app;
}

// ---------------------------------------------------------------------------
// validate — body (default target)
// ---------------------------------------------------------------------------

describe('validate middleware — body', () => {
  const schema = z.object({
    name: z.string().min(2),
    age: z.number().int().positive(),
  });

  it('passes valid body through and returns the parsed value', async () => {
    const app = makeApp(schema);

    const res = await request(app).post('/test').send({ name: 'Alice', age: 30 });

    expect(res.status).toBe(200);
    expect(res.body.parsed).toEqual({ name: 'Alice', age: 30 });
  });

  it('strips unknown fields (Zod default behaviour)', async () => {
    const app = makeApp(schema);

    const res = await request(app)
      .post('/test')
      .send({ name: 'Bob', age: 25, extra: 'should be stripped' });

    expect(res.status).toBe(200);
    expect(res.body.parsed).not.toHaveProperty('extra');
  });

  it('responds 422 for an invalid body', async () => {
    const app = makeApp(schema);

    const res = await request(app).post('/test').send({ name: 'X', age: -1 }); // name too short, age non-positive

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      code: 'VALIDATION_ERROR',
    });
    expect(res.body.details).toBeDefined();
  });

  it('responds 422 when required fields are missing', async () => {
    const app = makeApp(schema);

    const res = await request(app).post('/test').send({});

    expect(res.status).toBe(422);
    // Both name and age should have errors
    expect(res.body.details.name).toBeDefined();
    expect(res.body.details.age).toBeDefined();
  });

  it('responds 422 when body is empty (no JSON sent)', async () => {
    const app = makeApp(schema);

    const res = await request(app).post('/test').set('Content-Type', 'application/json').send('');

    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// validate — with coercion (z.coerce)
// ---------------------------------------------------------------------------

describe('validate middleware — coercion', () => {
  it('coerces string input to number when schema uses z.coerce.number()', async () => {
    // query-string values arrive as strings; coerce them
    const schema = z.object({
      limit: z.coerce.number().int().positive().default(20),
    });

    const app = makeApp(schema, 'query');

    const res = await request(app).post('/test?limit=50');

    expect(res.status).toBe(200);
    expect(res.body.parsed.limit).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// validate — schema with transform
// ---------------------------------------------------------------------------

describe('validate middleware — transform', () => {
  it('applies schema transform and exposes the transformed value downstream', async () => {
    const schema = z.object({
      email: z
        .string()
        .email()
        .transform((v) => v.toLowerCase()),
      role: z.string().transform((v) => v.toUpperCase()),
    });

    const app = makeApp(schema);

    const res = await request(app).post('/test').send({ email: 'USER@EXAMPLE.COM', role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.parsed.email).toBe('user@example.com');
    expect(res.body.parsed.role).toBe('ADMIN');
  });

  it('returns transformed default value when field is absent', async () => {
    const schema = z.object({
      page: z.coerce.number().default(1),
    });

    const app = makeApp(schema, 'query');

    // No query string — default should apply
    const res = await request(app).post('/test');

    expect(res.status).toBe(200);
    expect(res.body.parsed.page).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// validate — query target
// ---------------------------------------------------------------------------

describe('validate middleware — query target', () => {
  const schema = z.object({
    search: z.string().min(1),
    page: z.coerce.number().int().positive().default(1),
  });

  it('passes valid query parameters through', async () => {
    const app = makeApp(schema, 'query');

    const res = await request(app).post('/test?search=hello&page=2');

    expect(res.status).toBe(200);
    expect(res.body.parsed.search).toBe('hello');
    expect(res.body.parsed.page).toBe(2);
  });

  it('responds 422 for an invalid query parameter', async () => {
    const app = makeApp(schema, 'query');

    // 'search' is required (min 1) — omitting it should fail
    const res = await request(app).post('/test?page=1');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// validate — params target
// ---------------------------------------------------------------------------

describe('validate middleware — params target', () => {
  const schema = z.object({
    id: z.string().uuid(),
  });

  it('passes valid route params through', async () => {
    const validId = '550e8400-e29b-41d4-a716-446655440000';
    const app = makeApp(schema, 'params');

    const res = await request(app).post(`/test/${validId}`);

    expect(res.status).toBe(200);
    expect(res.body.parsed.id).toBe(validId);
  });

  it('responds 422 for an invalid route param', async () => {
    const app = makeApp(schema, 'params');

    const res = await request(app).post('/test/not-a-uuid');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Alias helpers — validateBody, validateQuery, validateParams
// ---------------------------------------------------------------------------

describe('validateBody alias', () => {
  it('validates request body identically to validate(schema, "body")', async () => {
    const schema = z.object({ message: z.string().min(1) });

    const app = express();
    app.use(express.json());
    app.post('/test', validateBody(schema), (req, res) => {
      res.json({ parsed: req.body as unknown });
    });
    app.use(errorHandler);

    const valid = await request(app).post('/test').send({ message: 'hello' });
    expect(valid.status).toBe(200);
    expect(valid.body.parsed.message).toBe('hello');

    const invalid = await request(app).post('/test').send({ message: '' });
    expect(invalid.status).toBe(422);
  });
});

describe('validateQuery alias', () => {
  it('validates query string identically to validate(schema, "query")', async () => {
    const schema = z.object({ q: z.string().min(1) });

    const app = express();
    app.use(express.json());
    app.get('/test', validateQuery(schema), (req, res) => {
      res.json({ parsed: req.query });
    });
    app.use(errorHandler);

    const valid = await request(app).get('/test?q=search-term');
    expect(valid.status).toBe(200);

    const invalid = await request(app).get('/test');
    expect(invalid.status).toBe(422);
  });
});

describe('validateParams alias', () => {
  it('validates route params identically to validate(schema, "params")', async () => {
    const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) });

    const app = express();
    app.use(express.json());
    app.get('/posts/:slug', validateParams(schema), (req, res) => {
      res.json({ parsed: req.params });
    });
    app.use(errorHandler);

    const valid = await request(app).get('/posts/my-blog-post');
    expect(valid.status).toBe(200);
    expect(valid.body.parsed.slug).toBe('my-blog-post');

    const invalid = await request(app).get('/posts/INVALID_SLUG!!');
    expect(invalid.status).toBe(422);
  });
});
