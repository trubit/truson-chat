/**
 * Jest code transformer — replaces `import.meta.url` with `__filename` so
 * that source files written for NodeNext ESM (which use import.meta.url as a
 * "is this the entry point?" guard) can be compiled to CommonJS by ts-jest
 * without producing a SyntaxError at runtime.
 *
 * This transformer wraps ts-jest's TsJestTransformer: it patches the source
 * text first, then delegates compilation to ts-jest.
 *
 * Usage in jest.config.cjs — replace the ts-jest entry in `transform` with:
 *   '^.+\\.tsx?$': [
 *     '<rootDir>/src/server/test-utils/importMetaTransformer.cjs',
 *     { tsconfig: 'tsconfig.server.test.json', diagnostics: { ignoreCodes: [1343, 1170] } },
 *   ]
 */

'use strict';

const { TsJestTransformer } = require('ts-jest');

// One shared transformer instance (created lazily so the config is available)
let _transformer = null;

function getTransformer(config) {
  if (!_transformer) {
    _transformer = new TsJestTransformer(config || {});
  }
  return _transformer;
}

function patchSource(sourceText) {
  // Replace `fileURLToPath(import.meta.url)` → `__filename`.
  // In CJS, __filename is already the absolute file path, so there is no
  // need to convert from a file:// URL.  The entire expression is replaced
  // so we don't leave a dangling `fileURLToPath(...)` call that would throw
  // "URL must be of scheme file" when passed a bare Windows path.
  let patched = sourceText.replace(/fileURLToPath\s*\(\s*import\.meta\.url\s*\)/g, '__filename');
  // Also handle the bare `import.meta.url` that appears on its own (without
  // being wrapped in fileURLToPath) — replace with a `file://` URL string
  // so any remaining fileURLToPath calls still work.
  patched = patched.replace(/\bimport\.meta\.url\b/g, '__filename');
  return patched;
}

module.exports = {
  process(sourceText, sourcePath, options) {
    const patched = patchSource(sourceText);
    return getTransformer(options.transformerConfig).process(patched, sourcePath, options);
  },

  processAsync(sourceText, sourcePath, options) {
    const patched = patchSource(sourceText);
    return getTransformer(options.transformerConfig).processAsync(patched, sourcePath, options);
  },

  getCacheKey(sourceText, sourcePath, options) {
    // Include the patched source in the cache key so that changes to the
    // regex substitution invalidate the cache correctly.
    const patched = patchSource(sourceText);
    return getTransformer(options.transformerConfig).getCacheKey(patched, sourcePath, options);
  },
};
