import {
  truncate,
  slugify,
  capitalize,
  camelToSnake,
  formatDate,
  timeAgo,
  isExpired,
  addMinutes,
  isEmail,
  isUrl,
  isUUID,
  isStrongPassword,
  formatBytes,
  clamp,
  randomInt,
} from '../index';

// ── truncate ──────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns the string unchanged when it is within the limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns the string unchanged when it equals the limit exactly', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends the ellipsis character (U+2026) when over limit', () => {
    expect(truncate('Hello world', 5)).toBe('Hello…');
  });

  it('truncates exactly at maxLen boundary', () => {
    const str = 'abcdef';
    const result = truncate(str, 3);
    // first 3 chars + ellipsis
    expect(result).toBe('abc…');
    expect(result.length).toBe(4); // 3 chars + 1 ellipsis codepoint
  });
});

// ── slugify ───────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it("converts 'Hello World!' to 'hello-world'", () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it("collapses multiple spaces — 'foo   bar' → 'foo-bar'", () => {
    expect(slugify('foo   bar')).toBe('foo-bar');
  });

  it('trims leading and trailing spaces', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('removes special characters leaving no separator', () => {
    // @ and # are stripped; no space/underscore left to become a dash
    expect(slugify('hello@world#test')).toBe('helloworldtest');
  });

  it('handles strings that are already slug-like', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });
});

// ── capitalize ────────────────────────────────────────────────────────────────

describe('capitalize', () => {
  it("capitalizes 'hello' to 'Hello'", () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('returns empty string unchanged', () => {
    expect(capitalize('')).toBe('');
  });

  it('does not change an already-capitalized string', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('only changes the first character', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });
});

// ── camelToSnake ──────────────────────────────────────────────────────────────

describe('camelToSnake', () => {
  it("converts 'myVariableName' to 'my_variable_name'", () => {
    expect(camelToSnake('myVariableName')).toBe('my_variable_name');
  });

  it("converts 'ABC' — each uppercase letter prefixed with underscore — to '_a_b_c'", () => {
    expect(camelToSnake('ABC')).toBe('_a_b_c');
  });

  it('leaves a lowercase-only string unchanged', () => {
    expect(camelToSnake('hello')).toBe('hello');
  });

  it("converts a single uppercase letter 'A' to '_a'", () => {
    expect(camelToSnake('A')).toBe('_a');
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  // Use a fixed date: 2024-03-05T07:04:02Z
  const fixedDate = new Date('2024-03-05T07:04:02.000Z');

  it('formats with YYYY/MM/DD pattern', () => {
    const result = formatDate(fixedDate, 'YYYY/MM/DD');
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(result).toContain('2024');
  });

  it('returns an ISO string when no format is supplied', () => {
    const result = formatDate(fixedDate);
    expect(result).toBe(fixedDate.toISOString());
  });

  it('pads single-digit months with a leading zero', () => {
    // January = month 1 → '01'
    const jan = new Date('2024-01-15T00:00:00.000Z');
    const result = formatDate(jan, 'MM');
    expect(result).toBe('01');
  });

  it('pads single-digit days with a leading zero', () => {
    const day5 = new Date('2024-03-05T00:00:00.000Z');
    const result = formatDate(day5, 'DD');
    expect(result).toBe('05');
  });

  it('accepts a numeric timestamp', () => {
    const ts = fixedDate.getTime();
    const result = formatDate(ts);
    expect(result).toBe(fixedDate.toISOString());
  });

  it('accepts a date string', () => {
    const result = formatDate('2024-06-15');
    expect(result).toContain('2024');
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("returns 'just now' for 0 seconds ago", () => {
    const now = Date.now();
    jest.setSystemTime(now);
    expect(timeAgo(new Date(now))).toBe('just now');
  });

  it("returns 'just now' for 1 second ago", () => {
    const now = Date.now();
    jest.setSystemTime(now);
    expect(timeAgo(new Date(now - 1000))).toBe('just now');
  });

  it("returns 'N seconds ago' for < 60 seconds and > 1 second", () => {
    const now = Date.now();
    jest.setSystemTime(now);
    const result = timeAgo(new Date(now - 30_000));
    expect(result).toBe('30 seconds ago');
  });

  it("returns '1 minute ago' for exactly 60 seconds", () => {
    const now = Date.now();
    jest.setSystemTime(now);
    expect(timeAgo(new Date(now - 60_000))).toBe('1 minute ago');
  });

  it("returns 'N minutes ago' for multiple minutes", () => {
    const now = Date.now();
    jest.setSystemTime(now);
    expect(timeAgo(new Date(now - 5 * 60_000))).toBe('5 minutes ago');
  });
});

// ── isExpired ─────────────────────────────────────────────────────────────────

describe('isExpired', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns true for a date in the past', () => {
    const now = Date.now();
    jest.setSystemTime(now);
    expect(isExpired(new Date(now - 1000))).toBe(true);
  });

  it('returns false for a date in the future', () => {
    const now = Date.now();
    jest.setSystemTime(now);
    expect(isExpired(new Date(now + 60_000))).toBe(false);
  });
});

// ── addMinutes ────────────────────────────────────────────────────────────────

describe('addMinutes', () => {
  it('adds the correct number of minutes', () => {
    const base = new Date('2024-01-01T00:00:00.000Z');
    const result = addMinutes(base, 30);
    expect(result.getTime()).toBe(base.getTime() + 30 * 60_000);
  });

  it('result.getTime() === input.getTime() + mins * 60000', () => {
    const base = new Date(1_000_000_000_000);
    const mins = 90;
    expect(addMinutes(base, mins).getTime()).toBe(base.getTime() + mins * 60_000);
  });

  it('handles negative minutes (subtracting time)', () => {
    const base = new Date('2024-06-01T12:00:00.000Z');
    const result = addMinutes(base, -10);
    expect(result.getTime()).toBe(base.getTime() - 10 * 60_000);
  });
});

// ── isEmail ───────────────────────────────────────────────────────────────────

describe('isEmail', () => {
  it('accepts a valid email address', () => {
    expect(isEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isEmail('user@mail.example.org')).toBe(true);
  });

  it('rejects a string missing @', () => {
    expect(isEmail('notanemail')).toBe(false);
  });

  it('rejects a string missing domain', () => {
    expect(isEmail('user@')).toBe(false);
  });

  it('rejects a string with spaces', () => {
    expect(isEmail('user @example.com')).toBe(false);
  });
});

// ── isUrl ─────────────────────────────────────────────────────────────────────

describe('isUrl', () => {
  it('accepts a valid https URL', () => {
    expect(isUrl('https://example.com')).toBe(true);
  });

  it('accepts a valid http URL with path', () => {
    expect(isUrl('http://example.com/path/to/resource')).toBe(true);
  });

  it('accepts a URL with query string', () => {
    expect(isUrl('https://example.com/search?q=test&lang=en')).toBe(true);
  });

  it('rejects a plain string without protocol', () => {
    expect(isUrl('example.com')).toBe(false);
  });

  it('rejects ftp protocol', () => {
    expect(isUrl('ftp://example.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isUrl('')).toBe(false);
  });
});

// ── isUUID ────────────────────────────────────────────────────────────────────

describe('isUUID', () => {
  it('accepts a valid UUID v4', () => {
    expect(isUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('accepts another valid UUID v4 (version digit 4, variant a)', () => {
    // Third segment starts with 4 (version), fourth starts with a (variant)
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
  });

  it('rejects a UUID v1-style (version digit 1)', () => {
    // Third segment starts with 1 — version bit is not 4
    expect(isUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isUUID('')).toBe(false);
  });
});

// ── isStrongPassword ──────────────────────────────────────────────────────────

describe('isStrongPassword', () => {
  it('accepts a password with all requirements met', () => {
    expect(isStrongPassword('P@ssw0rd123')).toBe(true);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(isStrongPassword('p@ssw0rd123')).toBe(false);
  });

  it('rejects a password missing a special character', () => {
    expect(isStrongPassword('Password123')).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(isStrongPassword('P@s1')).toBe(false);
  });

  it('rejects a password missing a digit', () => {
    expect(isStrongPassword('P@ssword!')).toBe(false);
  });

  it('rejects a password missing a lowercase letter', () => {
    expect(isStrongPassword('P@SSWORD1')).toBe(false);
  });
});

// ── formatBytes ───────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it("returns '0 B' for 0", () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it("returns '1 KB' for 1024", () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it("returns '1.5 KB' for 1536", () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it("returns '1 MB' for 1048576", () => {
    expect(formatBytes(1_048_576)).toBe('1 MB');
  });

  it("returns '1 GB' for 1 GiB", () => {
    expect(formatBytes(1_073_741_824)).toBe('1 GB');
  });
});

// ── clamp ─────────────────────────────────────────────────────────────────────

describe('clamp', () => {
  it('returns the value unchanged when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('returns min when value is below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('returns max when value is above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

// ── randomInt ─────────────────────────────────────────────────────────────────

describe('randomInt', () => {
  it('returns an integer within the inclusive [min, max] range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomInt(1, 10);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('returns min when min === max', () => {
    for (let i = 0; i < 20; i++) {
      expect(randomInt(7, 7)).toBe(7);
    }
  });

  it('can return both boundary values across many samples', () => {
    const results = new Set<number>();
    for (let i = 0; i < 500; i++) {
      results.add(randomInt(0, 1));
    }
    expect(results.has(0)).toBe(true);
    expect(results.has(1)).toBe(true);
  });
});
