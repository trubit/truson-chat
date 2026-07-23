import type { Request, Response, NextFunction } from 'express';
import type { ZodTypeAny, output } from 'zod';
import { AppError } from './errorHandler.js';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Factory that returns an Express middleware which validates the specified
 * part of the request against a Zod schema.
 *
 * On success the parsed (coerced + stripped) value is written back to
 * req[target] so downstream handlers receive clean typed data.
 *
 * On failure a ZodError is forwarded to the next error handler which turns it
 * into a 422 response via errorHandler.
 */
export function validate<T extends ZodTypeAny>(schema: T, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      // Forward the raw ZodError — errorHandler knows how to format it
      next(result.error);
      return;
    }

    // Overwrite the request property with the parsed (potentially transformed)
    // value so downstream handlers can treat it as type-safe.
    // Use Object.defineProperty to bypass the Express prototype getter for
    // req.query (which is getter-only and throws TypeError on direct assignment
    // in strict mode).
    Object.defineProperty(req, target, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: result.data as output<T>,
    });

    next();
  };
}

/**
 * Convenience alias: validate the full request body.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return validate(schema, 'body');
}

/**
 * Convenience alias: validate query-string parameters.
 */
export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return validate(schema, 'query');
}

/**
 * Convenience alias: validate route parameters.
 */
export function validateParams<T extends ZodTypeAny>(schema: T) {
  return validate(schema, 'params');
}

// Re-export AppError so callers can import from this module if they want to
// throw validation errors manually.
export { AppError };
