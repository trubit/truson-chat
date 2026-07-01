/**
 * MSW 2 request handlers for the client test suite.
 *
 * These handlers intercept HTTP requests made by client code (via fetch /
 * axios) and return predictable, test-friendly responses without hitting a
 * real server.  Add or override handlers inside individual tests with
 * `server.use(...)`.
 */
import { http, HttpResponse } from 'msw';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const TEST_USER = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
};

const TEST_ACCESS_TOKEN = 'test_access_token';

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
export const handlers = [
  // Auth — refresh access token
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({ data: { accessToken: TEST_ACCESS_TOKEN } }),
  ),

  // Auth — login
  http.post('/api/v1/auth/login', () =>
    HttpResponse.json({
      data: {
        user: TEST_USER,
        accessToken: TEST_ACCESS_TOKEN,
      },
    }),
  ),

  // Auth — logout
  http.post('/api/v1/auth/logout', () =>
    HttpResponse.json({ success: true }),
  ),

  // Users — current user profile
  http.get('/api/v1/users/me', () =>
    HttpResponse.json({ data: TEST_USER }),
  ),

  // Health check
  http.get('/health', () =>
    HttpResponse.json({ status: 'ok', env: 'test' }),
  ),
];
