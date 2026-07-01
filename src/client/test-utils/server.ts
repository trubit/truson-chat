/**
 * MSW Node server instance shared across the client test suite.
 *
 * Import `server` in test setup files to wire up lifecycle hooks, or in
 * individual tests to override handlers with `server.use(...)`.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
