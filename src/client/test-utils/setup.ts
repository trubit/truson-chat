/**
 * Jest setupFilesAfterEnv for the client project.
 *
 * Provides global test utilities that must be in place before each test file.
 * MSW is intentionally NOT started here — tests that need HTTP interception
 * should import { server } from '@/test-utils/server' and manage the
 * lifecycle themselves.
 */
import '@testing-library/jest-dom';

afterEach(() => {
  // Clear storage so Zustand persist middleware and any other storage-backed
  // state does not bleed between tests.
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }

  // Clear all Jest mocks so spy state doesn't leak across tests.
  jest.clearAllMocks();
});
