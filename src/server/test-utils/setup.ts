/**
 * Jest setupFilesAfterEnv for the server project.
 *
 * Runs after the test framework is installed in the environment but before
 * each test file executes.  Keep this file minimal — heavy lifecycle work
 * (DB spin-up, server start) belongs in per-suite helpers, not here.
 */

// Silence console noise that leaks from application code during tests.
// Winston's Console transport writes to console.log; Express error handlers
// and rate-limit-redis initialization also log to console.error/warn.
// We restore after each test so individual tests can still assert on console.
const originalConsoleLog = console.log.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// Exported so tests that need real console output can use it directly.
export { originalConsoleLog, originalConsoleError, originalConsoleWarn };
