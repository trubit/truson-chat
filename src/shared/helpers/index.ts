/**
 * Shared helpers — usable by both client and server.
 * No Node.js-only or browser-only APIs.
 */

/** Pause execution for `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry `fn` up to `maxAttempts` times, waiting `delayMs` between each attempt.
 * Throws the last error if all attempts fail.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Split `arr` into consecutive chunks of at most `size` elements.
 *
 * @example chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('chunk size must be greater than 0');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Return a shallow copy of `obj` without the specified `keys`.
 *
 * @example omit({ a: 1, b: 2, c: 3 }, ['b']) → { a: 1, c: 3 }
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Return a shallow copy of `obj` containing only the specified `keys`.
 *
 * @example pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) → { a: 1, c: 3 }
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Group the elements of `arr` by the value of `key`.
 *
 * @example groupBy([{role:'a'},{role:'b'},{role:'a'}], 'role')
 *   → { a: [{role:'a'},{role:'a'}], b: [{role:'b'}] }
 */
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});
}

/**
 * Return a debounced version of `fn` that delays invocation until `ms`
 * milliseconds have elapsed since the last call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: unknown[]) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  }) as T;
}
