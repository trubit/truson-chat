/**
 * Jest setupFiles — runs before any module is imported.
 *
 * Sets every environment variable required by the Zod schema in
 * src/server/config/env.ts so that getEnv() succeeds during tests.
 * Values are realistic-looking but safe for a test environment.
 */

// ── Core ─────────────────────────────────────────────────────────────────────
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3001';
process.env['APP_VERSION'] = '1.0.0-test';
process.env['CLIENT_URL'] = 'http://localhost:5173';

// ── MongoDB ───────────────────────────────────────────────────────────────────
// MongoMemoryServer replaces this URI in integration tests that need it.
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/linkora_test';
process.env['MONGODB_DB_NAME'] = 'linkora_test';

// ── Redis ─────────────────────────────────────────────────────────────────────
// ioredis-mock is mapped in jest.config.cjs, so connection is never opened.
process.env['REDIS_HOST'] = 'localhost';
process.env['REDIS_PORT'] = '6379';
process.env['REDIS_PASSWORD'] = 'test_redis_password';
process.env['REDIS_DB'] = '0';

// ── JWT ───────────────────────────────────────────────────────────────────────
// Secrets must be ≥ 32 characters (schema requirement).
process.env['JWT_ACCESS_SECRET'] = 'test_jwt_access_secret_that_is_at_least_32_chars';
process.env['JWT_REFRESH_SECRET'] = 'test_jwt_refresh_secret_that_is_at_least_32_chars';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';

// ── Session ───────────────────────────────────────────────────────────────────
process.env['SESSION_SECRET'] = 'test_session_secret_that_is_at_least_32_chars!!';
process.env['SESSION_MAX_AGE_MS'] = '604800000';

// ── Cloudinary ────────────────────────────────────────────────────────────────
process.env['CLOUDINARY_CLOUD_NAME'] = 'test_cloud_name';
process.env['CLOUDINARY_API_KEY'] = 'test_cloudinary_api_key';
process.env['CLOUDINARY_API_SECRET'] = 'test_cloudinary_api_secret';

// ── SMTP ──────────────────────────────────────────────────────────────────────
process.env['SMTP_HOST'] = 'smtp.example.com';
process.env['SMTP_PORT'] = '587';
process.env['SMTP_SECURE'] = 'false';
process.env['SMTP_USER'] = 'noreply@example.com';
process.env['SMTP_PASS'] = 'test_smtp_password';
process.env['SMTP_FROM_NAME'] = 'Linkora Test';
process.env['SMTP_FROM_EMAIL'] = 'noreply@example.com';

// ── Security / Rate limiting ──────────────────────────────────────────────────
process.env['BCRYPT_ROUNDS'] = '10'; // minimum allowed; faster in tests
process.env['RATE_LIMIT_WINDOW_MS'] = '900000';
process.env['RATE_LIMIT_MAX_REQUESTS'] = '100';

// ── File uploads ──────────────────────────────────────────────────────────────
process.env['MAX_FILE_SIZE_BYTES'] = '52428800';
process.env['UPLOAD_DIR'] = './uploads';

// ── Logging ───────────────────────────────────────────────────────────────────
// Keep tests quiet — only errors surface.
process.env['LOG_LEVEL'] = 'error';
process.env['LOG_FILE_ENABLED'] = 'false';
process.env['LOG_DIR'] = './logs';
