/**
 * Shared utility functions — string, date, validation, and number helpers.
 * No Node.js-only or browser-only APIs.
 */

// ── String Utilities ──────────────────────────────────────────────────────────

/**
 * Truncate `str` to at most `maxLen` characters, appending `…` when trimmed.
 *
 * @example truncate('Hello world', 5) → 'Hello…'
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/**
 * Convert `str` to a URL-safe slug.
 *
 * @example slugify('Hello World!') → 'hello-world'
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalise the first character of `str`.
 *
 * @example capitalize('hello') → 'Hello'
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a camelCase string to snake_case.
 *
 * @example camelToSnake('myVariableName') → 'my_variable_name'
 */
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, (_, char: string) => `_${char.toLowerCase()}`);
}

// ── Date Utilities ────────────────────────────────────────────────────────────

type DateLike = Date | string | number;

function toDate(d: DateLike): Date {
  return d instanceof Date ? d : new Date(d);
}

/**
 * Format `date` using a simple pattern (YYYY, MM, DD, HH, mm, ss).
 * Falls back to ISO string if no format is supplied.
 */
export function formatDate(date: DateLike, format?: string): string {
  const d = toDate(date);
  if (!format) return d.toISOString();

  const pad = (n: number): string => String(n).padStart(2, '0');
  return format
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

/**
 * Return a human-readable relative time string (e.g. "3 minutes ago").
 */
export function timeAgo(date: DateLike): string {
  const seconds = Math.floor((Date.now() - toDate(date).getTime()) / 1000);

  if (seconds < 60) return seconds <= 1 ? 'just now' : `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Return `true` if `date` is in the past.
 */
export function isExpired(date: DateLike): boolean {
  return toDate(date).getTime() < Date.now();
}

/**
 * Return a new Date that is `mins` minutes after `date`.
 */
export function addMinutes(date: DateLike, mins: number): Date {
  return new Date(toDate(date).getTime() + mins * 60_000);
}

// ── Validation Utilities ──────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE =
  /^(https?:\/\/)((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Min 8 chars, at least one uppercase, one lowercase, one digit, one special char
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

/** Return `true` if `str` is a valid e-mail address. */
export function isEmail(str: string): boolean {
  return EMAIL_RE.test(str);
}

/** Return `true` if `str` is a valid absolute URL (http or https). */
export function isUrl(str: string): boolean {
  return URL_RE.test(str);
}

/** Return `true` if `str` is a valid UUID v4. */
export function isUUID(str: string): boolean {
  return UUID_RE.test(str);
}

/** Return `true` if `str` satisfies password strength requirements. */
export function isStrongPassword(str: string): boolean {
  return STRONG_PASSWORD_RE.test(str);
}

// ── Number Utilities ──────────────────────────────────────────────────────────

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Format a byte count as a human-readable string.
 *
 * @example formatBytes(1536) → '1.5 KB'
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log2(Math.abs(bytes)) / 10), BYTE_UNITS.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[exp]}`;
}

/**
 * Clamp `n` to the range [`min`, `max`].
 *
 * @example clamp(150, 0, 100) → 100
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Return a random integer in the inclusive range [`min`, `max`].
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
