import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
const { verify } = jwt;
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';

// ---------------------------------------------------------------------------
// Augment Socket.IO SocketData so handlers receive typed user fields
// ---------------------------------------------------------------------------

declare module 'socket.io' {
  interface SocketData {
    userId: string;
    email: string;
  }
}

// ---------------------------------------------------------------------------
// JWT payload shape
// ---------------------------------------------------------------------------

interface JwtPayload {
  sub: string;
  userId?: string;
  email: string;
  iat: number;
  exp: number;
}

// ---------------------------------------------------------------------------
// Middleware type alias (works across namespaces)
// ---------------------------------------------------------------------------

type SocketMiddleware = (socket: Socket, next: (err?: Error) => void) => void;

// ---------------------------------------------------------------------------
// Auth middleware factory
// ---------------------------------------------------------------------------

function buildAuthMiddleware(accessSecret: string): SocketMiddleware {
  return (socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = verify(token, accessSecret) as JwtPayload;
      socket.data.userId = payload.sub ?? payload.userId;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  };
}

// ---------------------------------------------------------------------------
// Shared disconnect / error handlers
// ---------------------------------------------------------------------------

function attachLifecycleHandlers(socket: Socket, ns: string): void {
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected from ${ns}`, {
      socketId: socket.id,
      userId: socket.data.userId,
      reason,
    });
  });

  socket.on('error', (err: Error) => {
    logger.error(`Socket error in ${ns}`, {
      socketId: socket.id,
      userId: socket.data.userId,
      error: err.message,
    });
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export async function setupSocketServer(
  httpServer: HttpServer,
  redisAvailable = false,
): Promise<Server> {
  const env = getEnv();

  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25_000,
    pingTimeout: 60_000,
    maxHttpBufferSize: 1e6,
    transports: ['websocket', 'polling'],
  });

  // ── Redis pub/sub adapter ─────────────────────────────────────────────────
  // Only attempt when Redis is confirmed available (connectRedis() succeeded).
  if (redisAvailable) {
    const redisConfig = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
      db: env.REDIS_DB,
      lazyConnect: true,
    };

    const pubClient = new Redis(redisConfig);
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err: Error) =>
      logger.error('Socket.IO pub Redis error', { error: err.message }),
    );
    subClient.on('error', (err: Error) =>
      logger.error('Socket.IO sub Redis error', { error: err.message }),
    );

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter attached');
    } catch (err: unknown) {
      logger.warn('Socket.IO Redis adapter failed — using in-memory adapter', {
        error: err instanceof Error ? err.message : String(err),
      });
      pubClient.disconnect();
      subClient.disconnect();
    }
  } else {
    logger.info('Socket.IO using in-memory adapter (Redis not available)');
  }

  const authMiddleware = buildAuthMiddleware(env.JWT_ACCESS_SECRET);

  // ── /chat namespace ───────────────────────────────────────────────────────
  const chat = io.of('/chat');
  chat.use(authMiddleware);
  chat.on('connection', (socket) => {
    logger.info('Socket connected to /chat', {
      socketId: socket.id,
      userId: socket.data.userId,
    });
    attachLifecycleHandlers(socket, '/chat');

    // Broadcast online status to other sockets subscribed to this user's room
    socket.to(`user:${socket.data.userId}`).emit('user:online', {
      userId: socket.data.userId,
      lastSeen: null,
    });

    socket.on('disconnect', () => {
      // Broadcast offline status after disconnect
      io.of('/chat').emit('user:offline', {
        userId: socket.data.userId,
        lastSeen: new Date().toISOString(),
      });
    });

    // Handle presence heartbeat
    socket.on('user:heartbeat', () => {
      socket.emit('user:heartbeat:ack', { timestamp: Date.now() });
    });
  });

  // ── /calls namespace ──────────────────────────────────────────────────────
  const calls = io.of('/calls');
  calls.use(authMiddleware);
  calls.on('connection', (socket) => {
    logger.info('Socket connected to /calls', {
      socketId: socket.id,
      userId: socket.data.userId,
    });
    attachLifecycleHandlers(socket, '/calls');
  });

  // ── /notifications namespace ──────────────────────────────────────────────
  const notifications = io.of('/notifications');
  notifications.use(authMiddleware);
  notifications.on('connection', (socket) => {
    // Auto-join a personal room for targeted server-push delivery
    void socket.join(`user:${socket.data.userId}`);

    logger.info('Socket connected to /notifications', {
      socketId: socket.id,
      userId: socket.data.userId,
    });
    attachLifecycleHandlers(socket, '/notifications');
  });

  logger.info('Socket.IO server initialised', {
    namespaces: ['/chat', '/calls', '/notifications'],
  });

  return io;
}

// ---------------------------------------------------------------------------
// Helpers for server-side event delivery
// ---------------------------------------------------------------------------

/**
 * Emit an event to all sockets connected to the /notifications namespace
 * that are in the personal room for the given userId.
 *
 * Called by service-layer code to push session/device/security events
 * to the client without requiring client-initiated socket events.
 */
export function emitToUser(
  io: Server,
  userId: string,
  event: string,
  data: unknown,
): void {
  io.of('/notifications').to(`user:${userId}`).emit(event, data);
}

