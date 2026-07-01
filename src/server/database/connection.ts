import mongoose from 'mongoose';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';

// --------------------------------------------------------------------------
// Retry config
// --------------------------------------------------------------------------

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;

// --------------------------------------------------------------------------
// Connection state
// --------------------------------------------------------------------------

let isConnecting = false;
let retryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let eventsRegistered = false;

// --------------------------------------------------------------------------
// Mongoose connection options
// --------------------------------------------------------------------------

function getMongooseOptions(): mongoose.ConnectOptions {
  const env = getEnv();
  return {
    dbName: env.MONGODB_DB_NAME,
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    connectTimeoutMS: 10_000,
    heartbeatFrequencyMS: 10_000,
    retryWrites: true,
    retryReads: true,
  };
}

// --------------------------------------------------------------------------
// Event handlers
// --------------------------------------------------------------------------

function registerConnectionEvents(): void {
  if (eventsRegistered) return;
  eventsRegistered = true;

  const conn = mongoose.connection;

  conn.on('connected', () => {
    retryCount = 0;
    logger.info('MongoDB connected', {
      host: conn.host,
      port: conn.port,
      name: conn.name,
    });
  });

  conn.on('error', (err: Error) => {
    logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
  });

  conn.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    if (!isConnecting) {
      scheduleRetry();
    }
  });

  conn.on('reconnected', () => {
    retryCount = 0;
    logger.info('MongoDB reconnected');
  });

  conn.on('close', () => {
    logger.info('MongoDB connection closed');
  });

  conn.on('fullsetup', () => {
    logger.info('MongoDB replica set: all members connected');
  });
}

// --------------------------------------------------------------------------
// Exponential backoff retry
// --------------------------------------------------------------------------

function scheduleRetry(): void {
  if (retryCount >= MAX_RETRIES) {
    logger.error('MongoDB max retries reached — giving up', { retryCount });
    return;
  }

  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
  retryCount += 1;

  logger.warn(`MongoDB retry ${retryCount}/${MAX_RETRIES} in ${delay}ms`);

  retryTimer = setTimeout(async () => {
    retryTimer = null;
    try {
      await connectDatabase();
    } catch {
      // error already logged inside connectDatabase
    }
  }, delay);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export async function connectDatabase(): Promise<void> {
  if (
    mongoose.connection.readyState === mongoose.ConnectionStates.connected ||
    mongoose.connection.readyState === mongoose.ConnectionStates.connecting
  ) {
    return;
  }

  if (isConnecting) return;
  isConnecting = true;

  const { MONGODB_URI } = getEnv();

  try {
    logger.info('Connecting to MongoDB…', { attempt: retryCount + 1 });
    registerConnectionEvents();
    await mongoose.connect(MONGODB_URI, getMongooseOptions());
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('MongoDB initial connection failed', { error: error.message });
    scheduleRetry();
    throw error;
  } finally {
    isConnecting = false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  if (mongoose.connection.readyState === mongoose.ConnectionStates.disconnected) {
    return;
  }

  logger.info('Closing MongoDB connection…');
  await mongoose.connection.close(false); // false = do not force-close
  logger.info('MongoDB connection closed');
}

// Shutdown is coordinated by app.ts — no SIGINT/SIGTERM handlers here.
