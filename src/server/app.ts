import 'dotenv/config';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';

import { getEnv } from './config/env.js';
import { logger } from './logger/index.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { connectRedis, disconnectRedis, getRedisVersion } from './redis/connection.js';
import { initQueues, closeAllQueues } from './queues/index.js';
import { corsOptions } from './security/cors.js';
import { helmetOptions } from './security/helmet.js';
import { generalRateLimiter } from './security/rateLimit.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { setupSocketServer } from './sockets/server.js';
import { apiRouter } from './routes/index.js';

// ---------------------------------------------------------------------------
// Validate environment at startup — exits with an error if vars are missing
// ---------------------------------------------------------------------------

const env = getEnv();

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------

export const app = express();
export const httpServer = createServer(app);

// ── Trust proxy (Nginx / load-balancer) ──────────────────────────────────────
app.set('trust proxy', 1);

// ── Disable fingerprinting ────────────────────────────────────────────────────
app.disable('x-powered-by');

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet(helmetOptions));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ── Response compression ──────────────────────────────────────────────────────
app.use(compression());

// ── Cookie parsing ────────────────────────────────────────────────────────────
app.use(cookieParser(env.SESSION_SECRET));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP request logging ──────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// ── General rate limiting ─────────────────────────────────────────────────────
app.use(generalRateLimiter);

// ---------------------------------------------------------------------------
// Health check — before API router so it is never rate-limited / auth-gated
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: env.APP_VERSION,
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------

app.use('/api/v1', apiRouter);

// ---------------------------------------------------------------------------
// Error handling — must come after all routes
// ---------------------------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Graceful shutdown logic (single coordinator — no signal handlers in sub-modules)
// ---------------------------------------------------------------------------

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} received — starting graceful shutdown`);

  // Give in-flight HTTP requests 10 s to finish
  httpServer.close(async () => {
    logger.info('HTTP server closed');

    try {
      await Promise.all([disconnectDatabase(), disconnectRedis(), closeAllQueues()]);
      logger.info('All connections closed — process exiting');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  });

  // Force-exit after 30 s if something hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timeout — forcing exit');
    process.exit(1);
  }, 30_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Surface unhandled rejections as proper errors
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

// ---------------------------------------------------------------------------
// start() — called by the entry point (or tests via explicit import)
// ---------------------------------------------------------------------------

export async function start(): Promise<void> {
  await connectDatabase();

  // Redis is optional in development — the server degrades gracefully without it
  // (rate limiting falls back to memory, queues won't process, Socket.IO
  // stays single-node). In production a missing Redis should be fatal.
  let redisAvailable = false;
  try {
    await connectRedis();
    redisAvailable = true;
    const redisVersion = await getRedisVersion();
    const [major] = redisVersion.split('.').map(Number);
    if ((major ?? 0) >= 5) {
      initQueues();
      const { startMediaWorker } = await import('./workers/media.worker.js');
      startMediaWorker();
    } else {
      logger.warn(
        `Redis ${redisVersion} is too old for BullMQ (requires 5.0+) — background jobs disabled. ` +
          'Upgrade to Redis 5+ to enable email/notification queues.',
      );
    }
  } catch (err) {
    if (env.NODE_ENV === 'production') throw err;
    logger.warn('Redis unavailable — starting without Redis (dev mode)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  await setupSocketServer(httpServer, redisAvailable);

  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, () => {
      logger.info(`Linkora server listening`, {
        port: env.PORT,
        env: env.NODE_ENV,
        version: env.APP_VERSION,
        health: `/health`,
        api: `/api/v1`,
      });

      // Signal PM2 cluster mode that the process is ready
      if (typeof process.send === 'function') {
        process.send('ready');
      }

      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Auto-start only when executed directly, not when imported by tests.
// ESM equivalent of `if (require.main === module)`.
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch((err: unknown) => {
    logger.error('Failed to start server', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
}
