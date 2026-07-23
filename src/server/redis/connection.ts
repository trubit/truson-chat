import { Redis } from 'ioredis';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';

// --------------------------------------------------------------------------
// Retry strategy
// --------------------------------------------------------------------------

const MAX_RETRIES = process.env['NODE_ENV'] === 'production' ? 10 : 2;

function retryStrategy(times: number): number | null {
  if (times > MAX_RETRIES) {
    logger.warn('Redis: max reconnect attempts reached — giving up', { attempts: times });
    return null; // null stops retrying and rejects the connect() promise
  }
  // Full jitter: random in [0, cap] — prevents thundering herd on reconnect
  const cap = Math.min(1000 * Math.pow(2, times - 1), 30_000);
  const delayMs = Math.round(Math.random() * cap);
  logger.warn(`Redis reconnecting… attempt ${times}`, { delayMs });
  return delayMs;
}

// --------------------------------------------------------------------------
// Client factory
// --------------------------------------------------------------------------

function createRedisClient(): Redis {
  const env = getEnv();

  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    // Omit password when empty — sending AUTH "" fails on password-free Redis
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
    db: env.REDIS_DB,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    retryStrategy,
    reconnectOnError: (err: Error) => {
      // Reconnect on READONLY and LOADING errors (Redis failover)
      const targetErrors = ['READONLY', 'LOADING'];
      return targetErrors.some((msg) => err.message.includes(msg));
    },
  });

  client.on('connect', () => {
    logger.info('Redis connecting…', {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      db: env.REDIS_DB,
    });
  });

  client.on('ready', () => {
    logger.info('Redis ready');
  });

  client.on('error', (err: Error) => {
    logger.error('Redis error', { error: err.message });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    logger.warn('Redis reconnecting', { delayMs: delay });
  });

  client.on('end', () => {
    logger.info('Redis connection ended');
  });

  return client;
}

// --------------------------------------------------------------------------
// Singleton
// --------------------------------------------------------------------------

export const redisClient: Redis = createRedisClient();

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function connectRedis(): Promise<void> {
  if (redisClient.status === 'ready') return;

  logger.info('Connecting to Redis…');
  await redisClient.connect();
}

export async function getRedisVersion(): Promise<string> {
  const info = await redisClient.info('server');
  const match = info.match(/redis_version:([^\r\n]+)/);
  return match?.[1]?.trim() ?? '0.0.0';
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.status === 'end') return;

  logger.info('Closing Redis connection…');
  await redisClient.quit();
  logger.info('Redis connection closed');
}

// Shutdown is coordinated by app.ts — no SIGINT/SIGTERM handlers here.
