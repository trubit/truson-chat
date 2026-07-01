/**
 * CJS stub for the ESM-only `until-async` package.
 *
 * until-async ships an `.js` file with ESM `export` syntax, which Jest's
 * CommonJS module system cannot load.  The package provides a single
 * `until` utility function used by MSW's http-frame.js.
 *
 * Mapped via jest.config.cjs → client project → moduleNameMapper:
 *   '^until-async$': '<rootDir>/src/client/test-utils/__mocks__/until-async.cjs'
 */
'use strict';

async function until(callback) {
  try {
    return [null, await callback().catch((error) => { throw error; })];
  } catch (error) {
    return [error, null];
  }
}

module.exports = { until };
