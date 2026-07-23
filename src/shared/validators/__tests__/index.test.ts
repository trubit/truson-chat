import {
  objectIdSchema,
  uuidSchema,
  paginationSchema,
  phoneSchema,
  passwordSchema,
  usernameSchema,
} from '../index';

// ── objectIdSchema ────────────────────────────────────────────────────────────

describe('objectIdSchema', () => {
  it('accepts a valid 24-character lowercase hex string', () => {
    expect(() => objectIdSchema.parse('507f1f77bcf86cd799439011')).not.toThrow();
  });

  it('accepts a valid 24-character uppercase hex string', () => {
    expect(() => objectIdSchema.parse('507F1F77BCF86CD799439011')).not.toThrow();
  });

  it('accepts a mixed-case 24-character hex string', () => {
    expect(() => objectIdSchema.parse('507f1F77bCf86cD799439011')).not.toThrow();
  });

  it('rejects a 23-character string', () => {
    expect(() => objectIdSchema.parse('507f1f77bcf86cd7994390')).toThrow();
  });

  it('rejects a 25-character string', () => {
    expect(() => objectIdSchema.parse('507f1f77bcf86cd7994390110')).toThrow();
  });

  it('rejects a string with non-hex characters', () => {
    expect(() => objectIdSchema.parse('507f1f77bcf86cd79943901z')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => objectIdSchema.parse('')).toThrow();
  });
});

// ── uuidSchema ────────────────────────────────────────────────────────────────

describe('uuidSchema', () => {
  it('accepts a valid UUID v4', () => {
    // version digit = 4, variant bits = 8/9/a/b
    expect(() => uuidSchema.parse('f47ac10b-58cc-4372-a567-0e02b2c3d479')).not.toThrow();
  });

  it('accepts another valid UUID v4', () => {
    expect(() => uuidSchema.parse('550e8400-e29b-4000-a716-446655440000')).not.toThrow();
  });

  it('rejects a plain non-UUID string', () => {
    expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
  });

  it('accepts a UUID v1-style string — Zod validates UUID structure, not version', () => {
    // Zod's .uuid() validates RFC 4122 structure regardless of version digit (1-5)
    expect(() => uuidSchema.parse('550e8400-e29b-11d4-a716-446655440000')).not.toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => uuidSchema.parse('')).toThrow();
  });
});

// ── paginationSchema ──────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('applies defaults: page=1 and limit=20 when no input provided', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string '5' to number 5 for page", () => {
    const result = paginationSchema.parse({ page: '5' });
    expect(result.page).toBe(5);
  });

  it("coerces string '50' to number 50 for limit", () => {
    const result = paginationSchema.parse({ limit: '50' });
    expect(result.limit).toBe(50);
  });

  it('rejects page = 0 (min is 1)', () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
  });

  it('rejects limit = 101 (max is 100)', () => {
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
  });

  it('accepts limit = 100 (at the boundary)', () => {
    expect(() => paginationSchema.parse({ limit: 100 })).not.toThrow();
  });

  it('accepts a cursor string', () => {
    const result = paginationSchema.parse({ cursor: 'abc123' });
    expect(result.cursor).toBe('abc123');
  });

  it('cursor is optional — omitting it is fine', () => {
    const result = paginationSchema.parse({ page: 2 });
    expect(result.cursor).toBeUndefined();
  });
});

// ── phoneSchema ───────────────────────────────────────────────────────────────

describe('phoneSchema', () => {
  it("accepts '+1234567890' (E.164 format, 10 digits)", () => {
    expect(() => phoneSchema.parse('+1234567890')).not.toThrow();
  });

  it("accepts '1234567' (7 digits, starts with 1)", () => {
    expect(() => phoneSchema.parse('1234567')).not.toThrow();
  });

  it('accepts a 15-digit number without + prefix', () => {
    expect(() => phoneSchema.parse('123456789012345')).not.toThrow();
  });

  it("rejects '123456' (6 digits — too short: needs 7 after leading digit)", () => {
    // regex requires \+?[1-9]\d{6,14} — total min length is 7 (1 leading + 6)
    expect(() => phoneSchema.parse('123456')).toThrow();
  });

  it("rejects 'abc' (non-digit characters)", () => {
    expect(() => phoneSchema.parse('abc')).toThrow();
  });

  it('rejects a number starting with 0', () => {
    expect(() => phoneSchema.parse('0123456789')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => phoneSchema.parse('')).toThrow();
  });
});

// ── passwordSchema ────────────────────────────────────────────────────────────

describe('passwordSchema', () => {
  it("accepts 'P@ssw0rd123' — meets all requirements", () => {
    expect(() => passwordSchema.parse('P@ssw0rd123')).not.toThrow();
  });

  it("rejects 'P@s1' — fewer than 8 characters", () => {
    // 4 characters: P, @, s, 1
    expect(() => passwordSchema.parse('P@s1')).toThrow();
  });

  it("rejects 'allowercase1!' — no uppercase letter", () => {
    expect(() => passwordSchema.parse('allowercase1!')).toThrow();
  });

  it("rejects 'ALLUPPERCASE1!' — no lowercase letter", () => {
    expect(() => passwordSchema.parse('ALLUPPERCASE1!')).toThrow();
  });

  it("rejects 'NoSpecialChar1' — no special character", () => {
    expect(() => passwordSchema.parse('NoSpecialChar1')).toThrow();
  });

  it("rejects 'NoDigit@Here' — no digit", () => {
    expect(() => passwordSchema.parse('NoDigit@Here')).toThrow();
  });

  it('rejects a password longer than 128 characters', () => {
    const tooLong = 'A1a!' + 'x'.repeat(125); // 129 chars total
    expect(() => passwordSchema.parse(tooLong)).toThrow();
  });
});

// ── usernameSchema ────────────────────────────────────────────────────────────

describe('usernameSchema', () => {
  it("accepts 'validuser'", () => {
    expect(() => usernameSchema.parse('validuser')).not.toThrow();
  });

  it("accepts 'user.name_123' — dots, underscores, digits all allowed", () => {
    expect(() => usernameSchema.parse('user.name_123')).not.toThrow();
  });

  it('accepts a username with hyphens', () => {
    expect(() => usernameSchema.parse('user-name')).not.toThrow();
  });

  it("rejects 'ab' — too short (min 3)", () => {
    expect(() => usernameSchema.parse('ab')).toThrow();
  });

  it('rejects a 31-character string — too long (max 30)', () => {
    const thirtyOne = 'a'.repeat(31);
    expect(() => usernameSchema.parse(thirtyOne)).toThrow();
  });

  it("rejects 'invalid user!' — contains space and exclamation mark", () => {
    expect(() => usernameSchema.parse('invalid user!')).toThrow();
  });

  it('rejects a username with @', () => {
    expect(() => usernameSchema.parse('user@name')).toThrow();
  });

  it('accepts exactly 3 characters (lower boundary)', () => {
    expect(() => usernameSchema.parse('abc')).not.toThrow();
  });

  it('accepts exactly 30 characters (upper boundary)', () => {
    const thirty = 'a'.repeat(30);
    expect(() => usernameSchema.parse(thirty)).not.toThrow();
  });
});
