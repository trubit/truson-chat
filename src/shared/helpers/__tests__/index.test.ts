import { sleep, retry, chunk, omit, pick, groupBy, debounce } from '../index';

// ── sleep ─────────────────────────────────────────────────────────────────────

describe('sleep', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves after at least ms milliseconds', async () => {
    const promise = sleep(200);
    jest.advanceTimersByTime(200);
    await expect(promise).resolves.toBeUndefined();
  });

  it('resolves with undefined', async () => {
    const promise = sleep(0);
    jest.advanceTimersByTime(0);
    const result = await promise;
    expect(result).toBeUndefined();
  });

  it('does not resolve before ms elapses', () => {
    let resolved = false;
    sleep(100).then(() => {
      resolved = true;
    });
    jest.advanceTimersByTime(99);
    expect(resolved).toBe(false);
  });
});

// ── retry ─────────────────────────────────────────────────────────────────────

describe('retry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves immediately on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const promise = retry(fn, 3, 0);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until success — fails N-1 times then succeeds on Nth attempt', async () => {
    const err = new Error('transient');
    const fn = jest
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('done');
    const promise = retry(fn, 3, 10);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting all attempts', async () => {
    const lastError = new Error('last');
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockRejectedValueOnce(lastError);
    // Attach rejection handler first to avoid unhandled-rejection warnings
    const promise = retry(fn, 3, 10);
    const assertion = expect(promise).rejects.toBe(lastError);
    await jest.runAllTimersAsync();
    await assertion;
  });

  it('calls fn exactly maxAttempts times when always failing', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always'));
    const promise = retry(fn, 4, 10);
    // Attach rejection handler first to avoid unhandled-rejection warnings
    const assertion = expect(promise).rejects.toThrow('always');
    await jest.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('calls fn exactly once when successful on first try', async () => {
    const fn = jest.fn().mockResolvedValue(42);
    const promise = retry(fn, 5, 100);
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ── chunk ─────────────────────────────────────────────────────────────────────

describe('chunk', () => {
  it('splits [1,2,3,4,5] by 2 into [[1,2],[3,4],[5]]', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('splits [1,2,3] by 3 into [[1,2,3]]', () => {
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  it('returns [] for an empty array', () => {
    expect(chunk([], 2)).toEqual([]);
  });

  it('throws RangeError for size 0', () => {
    expect(() => chunk([1, 2], 0)).toThrow(RangeError);
  });

  it('throws RangeError for negative size', () => {
    expect(() => chunk([1, 2], -1)).toThrow(RangeError);
  });
});

// ── omit ──────────────────────────────────────────────────────────────────────

describe('omit', () => {
  it('omits the specified key from the result', () => {
    const result = omit({ a: 1, b: 2, c: 3 }, ['b']);
    expect(result).toEqual({ a: 1, c: 3 });
    expect('b' in result).toBe(false);
  });

  it('leaves unspecified keys intact', () => {
    const result = omit({ x: 10, y: 20 }, ['x']);
    expect(result).toHaveProperty('y', 20);
  });

  it('does not mutate the original object', () => {
    const original = { a: 1, b: 2 };
    omit(original, ['a']);
    expect(original).toEqual({ a: 1, b: 2 });
  });

  it('omits multiple keys at once', () => {
    const result = omit({ a: 1, b: 2, c: 3, d: 4 }, ['b', 'd']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('returns a copy unchanged when keys array is empty', () => {
    const result = omit({ a: 1 }, []);
    expect(result).toEqual({ a: 1 });
  });
});

// ── pick ──────────────────────────────────────────────────────────────────────

describe('pick', () => {
  it('picks only the specified keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('ignores keys not present in the object', () => {
    const obj = { a: 1 } as { a: number; b?: number };
    const result = pick(obj, ['a', 'b'] as (keyof typeof obj)[]);
    expect(result).toEqual({ a: 1 });
    expect('b' in result).toBe(false);
  });

  it('does not mutate the original object', () => {
    const original = { a: 1, b: 2, c: 3 };
    pick(original, ['a']);
    expect(original).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('returns an empty object when keys array is empty', () => {
    expect(pick({ a: 1, b: 2 }, [])).toEqual({});
  });
});

// ── groupBy ───────────────────────────────────────────────────────────────────

describe('groupBy', () => {
  it('groups items by a string key', () => {
    const items = [
      { role: 'admin', name: 'Alice' },
      { role: 'user', name: 'Bob' },
      { role: 'admin', name: 'Carol' },
    ];
    const result = groupBy(items, 'role');
    expect(result['admin']).toHaveLength(2);
    expect(result['user']).toHaveLength(1);
  });

  it('places multiple items with the same key in the same group', () => {
    const items = [{ type: 'a' }, { type: 'a' }, { type: 'b' }];
    const result = groupBy(items, 'type');
    expect(result['a']).toEqual([{ type: 'a' }, { type: 'a' }]);
    expect(result['b']).toEqual([{ type: 'b' }]);
  });

  it('returns an empty object for an empty array', () => {
    expect(groupBy([], 'key' as never)).toEqual({});
  });

  it('preserves full item shape in groups', () => {
    const items = [{ status: 'ok', value: 42 }];
    const result = groupBy(items, 'status');
    expect(result['ok'][0]).toEqual({ status: 'ok', value: 42 });
  });
});

// ── debounce ──────────────────────────────────────────────────────────────────

describe('debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('calls fn once after the delay expires', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not call fn before the delay expires', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced();
    jest.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
  });

  it('resets the timer on subsequent calls within the delay window', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced(); // reset — timer restarts from here
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled(); // 50ms into the second call's window

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments through to fn', () => {
    const fn = jest.fn();
    const debounced = debounce(fn as (...args: unknown[]) => unknown, 50);
    debounced('hello', 42);
    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledWith('hello', 42);
  });
});
