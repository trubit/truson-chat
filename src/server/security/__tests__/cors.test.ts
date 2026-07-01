/**
 * Unit tests for corsOptions.
 *
 * cors.ts reads CLIENT_URL from getEnv() which in turn reads process.env.
 * The environment variable is already set to 'http://localhost:5173' in
 * src/server/test-utils/env.ts (loaded via jest setupFiles).
 *
 * Because getEnv() caches its result in a module-level variable, we reset
 * the private cache between tests that mutate CLIENT_URL, using jest module
 * isolation where needed.
 *
 * The corsOptions object is eagerly evaluated when the module is imported, so
 * most tests call the `origin` callback function directly rather than
 * re-importing the module.
 */

import { corsOptions } from '../cors';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

type OriginCallback = (err: Error | null, allow?: boolean) => void;

// Extract the origin function from corsOptions (it is always a function here)
function callOrigin(
  origin: string | undefined,
  callback: OriginCallback,
): void {
  if (typeof corsOptions.origin !== 'function') {
    throw new Error('corsOptions.origin is not a function');
  }
  (corsOptions.origin as (
    origin: string | undefined,
    callback: OriginCallback,
  ) => void)(origin, callback);
}

// ---------------------------------------------------------------------------
// Static properties
// ---------------------------------------------------------------------------

describe('corsOptions static properties', () => {
  it('has credentials set to true', () => {
    expect(corsOptions.credentials).toBe(true);
  });

  it('includes all expected HTTP methods', () => {
    const methods = corsOptions.methods as string[];
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PUT');
    expect(methods).toContain('PATCH');
    expect(methods).toContain('DELETE');
  });

  it('includes OPTIONS in methods (required for preflight)', () => {
    const methods = corsOptions.methods as string[];
    expect(methods).toContain('OPTIONS');
  });

  it('allows Authorization header', () => {
    const headers = corsOptions.allowedHeaders as string[];
    expect(headers).toContain('Authorization');
    expect(headers).toContain('Content-Type');
  });

  it('exposes rate-limit headers', () => {
    const exposed = corsOptions.exposedHeaders as string[];
    expect(exposed).toContain('X-RateLimit-Limit');
    expect(exposed).toContain('X-RateLimit-Remaining');
    expect(exposed).toContain('X-RateLimit-Reset');
  });

  it('has a positive maxAge for preflight caching', () => {
    expect(typeof corsOptions.maxAge).toBe('number');
    expect(corsOptions.maxAge as number).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Origin callback — allowed
// ---------------------------------------------------------------------------

describe('corsOptions.origin callback — allowed origins', () => {
  it('allows the CLIENT_URL set in the test environment', (done) => {
    const clientUrl = process.env['CLIENT_URL'] as string; // 'http://localhost:5173'

    callOrigin(clientUrl, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('allows requests with no origin (server-to-server / curl)', (done) => {
    callOrigin(undefined, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('allows requests with empty-string origin treated as undefined', (done) => {
    // Some HTTP clients send an empty string; the origin check is `!origin`
    // which is truthy for '', so this should be allowed
    callOrigin('' as unknown as undefined, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });
});

// ---------------------------------------------------------------------------
// Origin callback — blocked
// ---------------------------------------------------------------------------

describe('corsOptions.origin callback — blocked origins', () => {
  it('blocks an unknown origin with an Error', (done) => {
    callOrigin('https://malicious.example.com', (err, allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toMatch(/not allowed/i);
      expect(allow).toBeUndefined();
      done();
    });
  });

  it('blocks an origin that is a substring of the allowed origin', (done) => {
    // 'http://localhost' without the port is NOT the same as 'http://localhost:5173'
    callOrigin('http://localhost', (err, allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(allow).toBeUndefined();
      done();
    });
  });

  it('blocks an origin with the wrong scheme (https vs http)', (done) => {
    // CLIENT_URL is http://localhost:5173; https version should be blocked
    callOrigin('https://localhost:5173', (err, allow) => {
      expect(err).toBeInstanceOf(Error);
      expect(allow).toBeUndefined();
      done();
    });
  });

  it('includes the blocked origin in the error message', (done) => {
    const blockedOrigin = 'https://attacker.invalid';
    callOrigin(blockedOrigin, (err) => {
      expect(err?.message).toContain(blockedOrigin);
      done();
    });
  });
});

// ---------------------------------------------------------------------------
// Test-env specific: CLIENT_URL is 'http://localhost:5173'
// ---------------------------------------------------------------------------

describe('corsOptions — test environment CLIENT_URL', () => {
  it('CLIENT_URL env var is the expected localhost Vite dev server URL', () => {
    expect(process.env['CLIENT_URL']).toBe('http://localhost:5173');
  });

  it('allows exactly http://localhost:5173 (the Vite dev server)', (done) => {
    callOrigin('http://localhost:5173', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });
});
