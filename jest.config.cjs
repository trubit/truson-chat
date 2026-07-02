/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'shared',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/shared/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.shared.test.json' }] },
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
      },
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      // Limit parallelism so MongoMemoryServer instances don't race each other.
      maxWorkers: 2,
      testMatch: ['<rootDir>/src/server/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': [
          // Custom wrapper around ts-jest that replaces `import.meta.url` with
          // `__filename` before TypeScript compilation.  This lets CommonJS Jest
          // load app.ts which uses import.meta.url as an ESM entry-point guard.
          '<rootDir>/src/server/test-utils/importMetaTransformer.cjs',
          {
            tsconfig: 'tsconfig.server.test.json',
            diagnostics: {
              // 1343 = import.meta only allowed in ES modules
              // 1170 = import.meta only valid with module NodeNext/ESNext
              ignoreCodes: [1343, 1170, 6133, 6196, 2790, 2769],
            },
          },
        ],
      },
      moduleNameMapper: {
        // Strip .js extensions so CommonJS Jest resolver finds .ts source files.
        // Source files use `import ... from './foo.js'` (NodeNext ESM convention)
        // but ts-jest compiles to CJS where the extension must be absent.
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // Mock ioredis with in-memory implementation
        '^ioredis$': 'ioredis-mock',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@server/(.*)$': '<rootDir>/src/server/$1',
      },
      setupFiles: ['<rootDir>/src/server/test-utils/env.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/server/test-utils/setup.ts'],
    },
    {
      displayName: 'client',
      // Custom environment: jsdom + Node.js Fetch API globals (Request,
      // Response, Headers, fetch).  MSW 2 interceptors extend these at
      // module-load time so they must be present before any test module runs.
      testEnvironment: '<rootDir>/src/client/test-utils/jest-env-with-fetch.cjs',
      testMatch: ['<rootDir>/src/client/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': [
          '<rootDir>/src/client/test-utils/importMetaTransformer.cjs',
          {
            tsconfig: 'tsconfig.client.test.json',
            diagnostics: false,
          },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/client/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        // MSW and @mswjs/interceptors use package-exports maps that Jest's
        // legacy CJS resolver cannot follow.  Map each subpath directly to
        // the compiled CommonJS entry point.
        '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
        '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
        '^@open-draft/deferred-promise$': '<rootDir>/src/client/test-utils/__mocks__/deferred-promise.cjs',
        '^msw/browser$': '<rootDir>/node_modules/msw/lib/browser/index.js',
        '^@mswjs/interceptors$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/index.cjs',
        '^@mswjs/interceptors/ClientRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.cjs',
        '^@mswjs/interceptors/XMLHttpRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/browser/interceptors/XMLHttpRequest/index.cjs',
        '^@mswjs/interceptors/fetch$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/index.cjs',
        '^@mswjs/interceptors/WebSocket$': '<rootDir>/node_modules/@mswjs/interceptors/lib/browser/interceptors/WebSocket/index.cjs',
        // rettime is ESM-only (.mjs); stub it with a CJS-compatible shim so
        // msw's define-network.js can be require()'d in CommonJS Jest.
        '^rettime$': '<rootDir>/src/client/test-utils/__mocks__/rettime.cjs',
        // until-async ships ESM-only (.js with export syntax); stub it.
        '^until-async$': '<rootDir>/src/client/test-utils/__mocks__/until-async.cjs',
        // Stub CSS modules
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // Stub image / font / media imports
        '\\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|tiff|woff|woff2|ttf|eot|otf|mp4|webm|ogg|mp3|wav|flac|aac)$':
          '<rootDir>/src/client/test-utils/fileMock.ts',
      },
      setupFiles: [
        // Polyfill Web Fetch API globals (Request, Response, Headers, fetch)
        // that jsdom 20 does not provide but MSW's interceptors require.
        '<rootDir>/src/client/test-utils/fetchPolyfill.ts',
      ],
      setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        '<rootDir>/src/client/test-utils/setup.ts',
      ],
      globals: {
        'import.meta': {
          env: {
            VITE_API_URL: '/api/v1',
            VITE_SOCKET_URL: '',
            DEV: false,
            PROD: false,
            MODE: 'test',
          },
        },
      },
    },
  ],

  // Root-level timeout applies to all projects (30 s covers slow server/integration tests).
  testTimeout: 30000,

  // Suppress console output (console.log / .error / .warn) produced by the
  // application code during tests (Winston logger, rate-limit-redis init, etc.)
  // PASS/FAIL results are still shown — only per-test console noise is silenced.
  silent: true,

  // Force Jest to exit after all tests complete so supertest/Express open
  // handles don't keep the process alive indefinitely.
  forceExit: true,

  collectCoverageFrom: [
    'src/server/**/*.ts',
    'src/client/**/*.{ts,tsx}',
    'src/shared/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/*.test.{ts,tsx}',
    '!**/test-utils/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
