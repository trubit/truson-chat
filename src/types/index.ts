/**
 * Global TypeScript ambient declarations and utility types for Linkora.
 * Imported once in tsconfig paths; do not add runtime logic here.
 */

import type { PaginationMeta } from '@shared/types/api.js';

// ── Primitive aliases ─────────────────────────────────────────────────────────

/** A MongoDB ObjectId serialised as a 24-character hex string. */
export type ID = string;

/** An ISO 8601 date-time string (e.g. "2026-01-15T10:30:00.000Z"). */
export type Timestamp = string;

// ── Nullability ───────────────────────────────────────────────────────────────

/** `T` or `null`. */
export type Nullable<T> = T | null;

/** `T` or `undefined`. */
export type Optional<T> = T | undefined;

// ── Deep modifiers ────────────────────────────────────────────────────────────

/** Recursively make all properties of `T` optional. */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/** Recursively make all properties of `T` readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

// ── Function types ────────────────────────────────────────────────────────────

/** A zero-argument async function returning `T`. */
export type AsyncFn<T> = () => Promise<T>;

// ── Model helpers ─────────────────────────────────────────────────────────────

/** Add a `_id: ID` field to `T` (mirrors Mongoose's plain document shape). */
export type WithId<T> = T & { _id: ID };

// ── Pagination ────────────────────────────────────────────────────────────────

/** A paginated result set wrapping an array of `T`. */
export type Paginated<T> = {
  data: T[];
  meta: PaginationMeta;
};

// Re-export PaginationMeta so consumers only need one import.
export type { PaginationMeta };
