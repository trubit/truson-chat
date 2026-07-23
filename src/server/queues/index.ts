import { Queue, type ConnectionOptions } from 'bullmq';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';

// --------------------------------------------------------------------------
// Shared Redis connection options for BullMQ
// --------------------------------------------------------------------------

function getRedisConnection(): ConnectionOptions {
  const env = getEnv();
  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
    db: env.REDIS_DB,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (getEnv().NODE_ENV !== 'production' && times > 3) return null;
      // Full jitter exponential backoff — avoids stampede on Redis restart
      const cap = Math.min(500 * Math.pow(2, times - 1), 30_000);
      return Math.round(Math.random() * cap);
    },
  };
}

// --------------------------------------------------------------------------
// Shared default job options
// --------------------------------------------------------------------------

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
};

// --------------------------------------------------------------------------
// Queue factory
// --------------------------------------------------------------------------

function createQueue(name: string): Queue {
  const queue = new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions,
  });

  queue.on('error', (err: Error) => {
    logger.error(`Queue error [${name}]`, { error: err.message, queue: name });
  });

  return queue;
}

// --------------------------------------------------------------------------
// Lazy queue registry — queues are only created after Redis connects.
// Call initQueues() from start() once connectRedis() succeeds.
// --------------------------------------------------------------------------

const QUEUE_NAMES = [
  'email-queue',
  'notification-queue',
  'media-queue',
  'cleanup-queue',
  'analytics-queue',
  'audit-queue',
] as const;

type QueueName = (typeof QUEUE_NAMES)[number];

const registry = new Map<QueueName, Queue>();

export function initQueues(): void {
  if (registry.size > 0) return;
  for (const name of QUEUE_NAMES) {
    registry.set(name, createQueue(name));
  }
  logger.info('BullMQ queues initialised', { queues: [...QUEUE_NAMES] });
}

// Typed accessors — throw if used before initQueues()
function getQueue(name: QueueName): Queue {
  const q = registry.get(name);
  if (!q) throw new Error(`Queue "${name}" not initialised — call initQueues() first`);
  return q;
}

export const getEmailQueue = () => getQueue('email-queue');
export const getNotificationQueue = () => getQueue('notification-queue');
export const getMediaQueue = () => getQueue('media-queue');
export const getCleanupQueue = () => getQueue('cleanup-queue');
export const getAnalyticsQueue = () => getQueue('analytics-queue');
export const getAuditQueue = () => getQueue('audit-queue');

// --------------------------------------------------------------------------
// Graceful shutdown
// --------------------------------------------------------------------------

export async function closeAllQueues(): Promise<void> {
  if (registry.size === 0) return;
  logger.info('Closing all BullMQ queues…');
  await Promise.all([...registry.values()].map((q) => q.close()));
  registry.clear();
  logger.info('All BullMQ queues closed');
}
