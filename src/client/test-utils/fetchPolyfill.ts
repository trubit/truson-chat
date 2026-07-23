/**
 * Polyfill Web Fetch API globals for Jest + jsdom.
 *
 * jsdom 20 does not ship with Fetch API globals (Request, Response, Headers,
 * fetch, ReadableStream).  Node 18+ exposes them natively on the Node.js
 * `global` object.
 *
 * Jest's `setupFiles` scripts execute inside the test-environment VM (jsdom),
 * so bare identifiers like `Request` resolve against the jsdom window — where
 * they don't exist.  We must access them through Node's `global` object, which
 * IS reachable even inside the jsdom sandbox.
 *
 * This file is listed in jest.config.cjs → client project → `setupFiles` so it
 * runs before the MSW server (setupFilesAfterEnv) is constructed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const nodeGlobal = globalThis as any; // Node 18+ exposes Fetch on globalThis
const vmGlobal = globalThis as any; // same reference in Jest/jsdom env

const FETCH_NAMES = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'FormData',
  'Blob',
  'File',
  'TextEncoder',
  'TextDecoder',
  'AbortController',
  'AbortSignal',
] as const;

for (const name of FETCH_NAMES) {
  if (typeof vmGlobal[name] === 'undefined' && typeof nodeGlobal[name] !== 'undefined') {
    vmGlobal[name] = nodeGlobal[name];
  }
}
