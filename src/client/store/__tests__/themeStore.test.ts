import { useThemeStore } from '@/store/themeStore';

// ---------------------------------------------------------------------------
// Mock window.matchMedia BEFORE the module is imported.
// The themeStore calls matchMedia at module initialisation time via
// getSystemTheme(). We define this on `window` here, and the jest.config.cjs
// `globals` ensure `window` is the jsdom window in the client project.
// ---------------------------------------------------------------------------

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false, // simulate light mode
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Reset state before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  // Force a known baseline regardless of system preference or localStorage.
  useThemeStore.setState({
    mode: 'light',
    sidebarOpen: true,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('themeStore', () => {
  describe('initial state (mocked matchMedia → light mode)', () => {
    it('has mode "light" when matchMedia returns false for dark', () => {
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('has sidebarOpen true', () => {
      expect(useThemeStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', () => {
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('toggles from dark back to light', () => {
      useThemeStore.getState().toggleTheme(); // light → dark
      useThemeStore.getState().toggleTheme(); // dark → light
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('does not affect sidebarOpen', () => {
      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('sets mode to "dark"', () => {
      useThemeStore.getState().setTheme('dark');
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('sets mode to "light" when already dark', () => {
      useThemeStore.getState().setTheme('dark');
      useThemeStore.getState().setTheme('light');
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('is idempotent — setting the same mode twice keeps that mode', () => {
      useThemeStore.getState().setTheme('dark');
      useThemeStore.getState().setTheme('dark');
      expect(useThemeStore.getState().mode).toBe('dark');
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebarOpen from true to false', () => {
      useThemeStore.getState().toggleSidebar();
      expect(useThemeStore.getState().sidebarOpen).toBe(false);
    });

    it('toggles sidebarOpen from false back to true', () => {
      useThemeStore.getState().toggleSidebar(); // true → false
      useThemeStore.getState().toggleSidebar(); // false → true
      expect(useThemeStore.getState().sidebarOpen).toBe(true);
    });

    it('does not affect mode', () => {
      useThemeStore.getState().toggleSidebar();
      expect(useThemeStore.getState().mode).toBe('light');
    });
  });

  describe('setSidebarOpen', () => {
    it('sets sidebarOpen to false', () => {
      useThemeStore.getState().setSidebarOpen(false);
      expect(useThemeStore.getState().sidebarOpen).toBe(false);
    });

    it('sets sidebarOpen to true', () => {
      useThemeStore.getState().setSidebarOpen(false);
      useThemeStore.getState().setSidebarOpen(true);
      expect(useThemeStore.getState().sidebarOpen).toBe(true);
    });

    it('is idempotent — calling with false twice keeps sidebarOpen false', () => {
      useThemeStore.getState().setSidebarOpen(false);
      useThemeStore.getState().setSidebarOpen(false);
      expect(useThemeStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe('combined operations', () => {
    it('theme and sidebar state are independent', () => {
      useThemeStore.getState().setTheme('dark');
      useThemeStore.getState().setSidebarOpen(false);

      expect(useThemeStore.getState().mode).toBe('dark');
      expect(useThemeStore.getState().sidebarOpen).toBe(false);

      useThemeStore.getState().toggleTheme();
      expect(useThemeStore.getState().mode).toBe('light');
      expect(useThemeStore.getState().sidebarOpen).toBe(false); // unchanged
    });
  });
});
