/**
 * Jest code transformer for client (Vite) source files.
 *
 * TypeScript compiled to CommonJS leaves `import.meta` intact, causing a
 * SyntaxError in Node.js ("Cannot use 'import.meta' outside a module").
 * This transformer patches source text before ts-jest compiles it:
 *
 *   import.meta.env  → fixed test environment object
 *   import.meta.url  → __filename
 *   import.meta      → ({})   (any remaining references)
 */

'use strict';

const { TsJestTransformer } = require('ts-jest');

let _transformer = null;

function getTransformer(config) {
  if (!_transformer) {
    _transformer = new TsJestTransformer(config || {});
  }
  return _transformer;
}

const TEST_ENV_OBJECT =
  '({"VITE_API_URL":"/api/v1","VITE_SOCKET_URL":"","DEV":false,"PROD":false,"MODE":"test","BASE_URL":"/"})';

function patchSource(sourceText) {
  let patched = sourceText
    // Must be ordered: env first (most specific), then url, then bare import.meta
    .replace(/\bimport\.meta\.env\b/g, TEST_ENV_OBJECT)
    .replace(/\bimport\.meta\.url\b/g, '__filename')
    .replace(/\bimport\.meta\b/g, '({})');
  return patched;
}

module.exports = {
  process(sourceText, sourcePath, options) {
    return getTransformer(options.transformerConfig).process(
      patchSource(sourceText),
      sourcePath,
      options,
    );
  },

  processAsync(sourceText, sourcePath, options) {
    return getTransformer(options.transformerConfig).processAsync(
      patchSource(sourceText),
      sourcePath,
      options,
    );
  },

  getCacheKey(sourceText, sourcePath, options) {
    return getTransformer(options.transformerConfig).getCacheKey(
      patchSource(sourceText),
      sourcePath,
      options,
    );
  },
};
