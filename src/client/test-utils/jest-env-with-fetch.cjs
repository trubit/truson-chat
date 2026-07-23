/**
 * Custom Jest environment: jsdom + Node.js Fetch API globals.
 *
 * jest-environment-jsdom 29 / jsdom 20 does not include the Fetch API
 * (Request, Response, Headers, fetch, etc.).  MSW 2's Node interceptors
 * extend these classes at module-load time, so they must be present on
 * `global` before any test module is evaluated.
 *
 * This environment subclasses JSDOMEnvironment and copies the Fetch globals
 * from the real Node.js `global` into the jsdom VM sandbox in `setup()`,
 * which is called before setupFiles / setupFilesAfterEnv run.
 */

'use strict';

// jest-environment-jsdom uses ESM interop: the class is at `.default`
const _jsdomPkg = require('jest-environment-jsdom');
const JSDOMEnvironment = _jsdomPkg.default ?? _jsdomPkg.TestEnvironment ?? _jsdomPkg;

const FETCH_GLOBALS = [
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
  'URL',
  'URLSearchParams',
  'BroadcastChannel',
];

class JSDOMWithFetchEnvironment extends JSDOMEnvironment {
  async setup() {
    await super.setup();

    // `this.global` is the jsdom VM sandbox object.
    // Copy Fetch API globals from Node's real `global` so that
    // MSW interceptors (which extend Request / Response) can load.
    for (const name of FETCH_GLOBALS) {
      if (typeof this.global[name] === 'undefined' && typeof global[name] !== 'undefined') {
        this.global[name] = global[name];
      }
    }
  }
}

module.exports = JSDOMWithFetchEnvironment;
