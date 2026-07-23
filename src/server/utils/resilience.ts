import { logger } from '../logger/index.js';

// ---------------------------------------------------------------------------
// delay
// ---------------------------------------------------------------------------

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// withRetry — exponential backoff with full jitter
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Maximum number of total attempts (first + retries). Default: 3 */
  maxAttempts?: number;
  /** Base delay for the first retry window in ms. Default: 100 */
  baseDelayMs?: number;
  /** Hard cap on computed delay. Default: 30_000 */
  maxDelayMs?: number;
  /** Exponential multiplier. Default: 2 */
  factor?: number;
  /**
   * 'full'  — random(0, cap)                — widest spread, best for thundering herd
   * 'equal' — cap/2 + random(0, cap/2)      — bounded minimum delay
   * 'none'  — deterministic cap (no jitter)  — only for tests
   */
  jitter?: 'full' | 'equal' | 'none';
  /** Called before each retry sleep. Useful for logging. */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  /**
   * Return false to stop retrying and rethrow immediately.
   * Default: always retry (true).
   */
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 30_000,
    factor = 2,
    jitter = 'full',
    onRetry,
    shouldRetry = () => true,
  } = opts;

  let attempt = 0;

  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const error = err instanceof Error ? err : new Error(String(err));

      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const cap = Math.min(baseDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);

      let waitMs: number;
      if (jitter === 'full') {
        waitMs = Math.random() * cap;
      } else if (jitter === 'equal') {
        waitMs = cap / 2 + Math.random() * (cap / 2);
      } else {
        waitMs = cap;
      }

      waitMs = Math.round(Math.min(waitMs, maxDelayMs));

      onRetry?.(attempt, error, waitMs);
      await delay(waitMs);
    }
  }
}

// ---------------------------------------------------------------------------
// withTimeout — wraps any async operation with a hard deadline
// ---------------------------------------------------------------------------

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// CircuitBreaker — prevents cascading failures on flaky external services
// ---------------------------------------------------------------------------

type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Consecutive successes in half-open to close again. Default: 2 */
  successThreshold?: number;
  /** Time to wait after opening before allowing a half-open probe (ms). Default: 60_000 */
  halfOpenTimeMs?: number;
  /** Called on every state transition. */
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly halfOpenTimeMs: number;
  private readonly onStateChange: (from: CircuitState, to: CircuitState, name: string) => void;

  constructor(
    private readonly name: string,
    opts: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.successThreshold = opts.successThreshold ?? 2;
    this.halfOpenTimeMs = opts.halfOpenTimeMs ?? 60_000;
    this.onStateChange =
      opts.onStateChange ??
      ((from, to, cbName) => {
        logger.warn(`CircuitBreaker [${cbName}] state change`, { from, to });
      });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.halfOpenTimeMs) {
        throw new Error(
          `Circuit breaker [${this.name}] is OPEN — refusing call (retry in ${Math.ceil((this.halfOpenTimeMs - elapsed) / 1000)}s)`,
        );
      }
      this.transition('half-open');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  get currentState(): CircuitState {
    return this.state;
  }

  /** Manually reset to closed (useful in tests or admin tooling). */
  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.transition('closed');
  }

  private recordSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.successes = 0;
        this.transition('closed');
      }
    }
  }

  private recordFailure(): void {
    this.successes = 0;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.transition('open');
      return;
    }

    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.transition('open');
    }
  }

  private transition(to: CircuitState): void {
    const from = this.state;
    if (from === to) return;
    this.state = to;
    this.onStateChange(from, to, this.name);
  }
}
