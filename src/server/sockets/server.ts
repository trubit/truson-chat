import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
const { verify } = jwt;
import mongoose from 'mongoose';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';
import { redisClient } from '../redis/connection.js';
import { ConversationMemberModel } from '../database/models/ConversationMember.js';
import { PresenceRepository } from '../modules/presence/repository/index.js';
import { PresenceService } from '../modules/presence/service/index.js';
import { messageService } from '../modules/messages/service/index.js';
import type { SendMessagePayload } from '../../shared/types/message.js';

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

    // Set user online when socket connects
    try {
      const presenceRepo = new PresenceRepository();
      const presenceService = new PresenceService(presenceRepo);
      void presenceService.setUserOnline(socket.data.userId);
    } catch { /* graceful */ }

    socket.on('disconnect', async () => {
      // Broadcast offline status after disconnect
      io.of('/chat').emit('user:offline', {
        userId: socket.data.userId,
        lastSeen: new Date().toISOString(),
      });
      try {
        const presenceRepo = new PresenceRepository();
        const presenceService = new PresenceService(presenceRepo);
        await presenceService.setUserOffline(socket.data.userId);
        socket.broadcast.emit('presence:updated', {
          userId: socket.data.userId,
          status: 'offline',
        });
      } catch { /* graceful */ }
    });

    // Handle presence heartbeat
    socket.on('user:heartbeat', () => {
      socket.emit('user:heartbeat:ack', { timestamp: Date.now() });
    });

    // Presence: allow clients to explicitly set their status
    socket.on('presence:set_status', async (data: { status: string; customStatus?: string; statusMessage?: string }) => {
      try {
        const validStatuses = ['online', 'offline', 'away', 'busy', 'invisible'];
        if (!validStatuses.includes(data.status)) return;
        const presenceRepo = new PresenceRepository();
        const presenceService = new PresenceService(presenceRepo);
        await presenceService.updatePresence(socket.data.userId, {
          status: data.status as 'online' | 'offline' | 'away' | 'busy' | 'invisible',
          customStatus: data.customStatus,
          statusMessage: data.statusMessage,
        });
        // Broadcast to friends (simple broadcast to room for now)
        socket.broadcast.emit('presence:updated', {
          userId: socket.data.userId,
          status: data.status,
          customStatus: data.customStatus,
        });
      } catch { /* graceful */ }
    });

    // Friend request sent — notify recipient
    socket.on('friend:notify_request', async (data: { recipientId: string }) => {
      try {
        // Emit to the recipient's socket room if they're online
        io.of('/notifications').to(`user:${data.recipientId}`).emit('friend:request_received', {
          senderId: socket.data.userId,
        });
      } catch { /* graceful */ }
    });

    // ── Messaging event handlers ─────────────────────────────────────────────

    const userId = socket.data.userId;

    // 1. Join personal room
    void socket.join(`user:${userId}`);

    // 2. Join all active conversation rooms
    (async () => {
      try {
        const members = await ConversationMemberModel.find({
          userId: new mongoose.Types.ObjectId(userId),
          leftAt: null,
        })
          .select('conversationId')
          .lean();
        for (const m of members) {
          void socket.join(`conversation:${m.conversationId.toString()}`);
        }
      } catch (err) {
        logger.error('Failed to join conversation rooms on connect', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    // 3. Handle message:send
    socket.on(
      'message:send',
      async (
        payload: SendMessagePayload,
        callback: ((result: unknown) => void) | undefined,
      ) => {
        try {
          const result = await messageService.sendMessage(userId, {
            conversationId: payload.conversationId,
            type: payload.type as import('../modules/messages/types/index.js').MsgTypeValues,
            content: payload.content,
            replyTo: payload.replyTo,
            mentions: payload.mentions,
          });
          // Emit to all members of the conversation
          chat
            .to(`conversation:${payload.conversationId}`)
            .emit('message:new', result);
          // ACK to sender
          if (typeof callback === 'function')
            callback({ success: true, message: result });
        } catch (err) {
          logger.error('message:send error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
          if (typeof callback === 'function')
            callback({
              success: false,
              error: err instanceof Error ? err.message : 'Error sending message',
            });
        }
      },
    );

    // 4. Handle message:edit
    socket.on(
      'message:edit',
      async (
        payload: { messageId: string; content: string },
        callback: ((result: unknown) => void) | undefined,
      ) => {
        try {
          const result = await messageService.editMessage(userId, payload.messageId, {
            content: payload.content,
          });
          chat
            .to(`conversation:${result.conversationId}`)
            .emit('message:updated', result);
          if (typeof callback === 'function')
            callback({ success: true, message: result });
        } catch (err) {
          logger.error('message:edit error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
          if (typeof callback === 'function')
            callback({
              success: false,
              error: err instanceof Error ? err.message : 'Error editing message',
            });
        }
      },
    );

    // 5. Handle message:delete
    socket.on(
      'message:delete',
      async (
        payload: { messageId: string },
        callback: ((result: unknown) => void) | undefined,
      ) => {
        try {
          const result = await messageService.deleteMessage(userId, payload.messageId);
          chat
            .to(`conversation:${result.conversationId}`)
            .emit('message:deleted', {
              messageId: result._id,
              conversationId: result.conversationId,
            });
          if (typeof callback === 'function')
            callback({ success: true, messageId: result._id });
        } catch (err) {
          logger.error('message:delete error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
          if (typeof callback === 'function')
            callback({
              success: false,
              error: err instanceof Error ? err.message : 'Error deleting message',
            });
        }
      },
    );

    // 6. Handle message:react
    socket.on(
      'message:react',
      async (
        payload: { messageId: string; emoji: string; conversationId: string },
        callback: ((result: unknown) => void) | undefined,
      ) => {
        try {
          const result = await messageService.toggleReaction(
            userId,
            payload.messageId,
            { emoji: payload.emoji },
          );
          chat
            .to(`conversation:${payload.conversationId}`)
            .emit('message:reaction', {
              messageId: payload.messageId,
              conversationId: payload.conversationId,
              ...result,
            });
          if (typeof callback === 'function')
            callback({ success: true, ...result });
        } catch (err) {
          logger.error('message:react error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
          if (typeof callback === 'function')
            callback({
              success: false,
              error: err instanceof Error ? err.message : 'Error reacting to message',
            });
        }
      },
    );

    // 7. Handle message:read
    socket.on(
      'message:read',
      async (payload: { conversationId: string; messageId: string }) => {
        try {
          await messageService.markRead(
            userId,
            payload.conversationId,
            payload.messageId,
          );
          // Notify other members that this user has read up to this message
          socket.to(`conversation:${payload.conversationId}`).emit('message:read', {
            conversationId: payload.conversationId,
            messageId: payload.messageId,
            userId,
            readAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.error('message:read error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    );

    // 8. Handle typing:start
    socket.on(
      'typing:start',
      async (payload: { conversationId: string }) => {
        try {
          const key = `typing:${payload.conversationId}:${userId}`;
          await redisClient.setex(key, 8, '1');
          socket
            .to(`conversation:${payload.conversationId}`)
            .emit('typing:start', {
              conversationId: payload.conversationId,
              userId,
            });
        } catch (err) {
          logger.error('typing:start error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    );

    // 9. Handle typing:stop
    socket.on(
      'typing:stop',
      async (payload: { conversationId: string }) => {
        try {
          const key = `typing:${payload.conversationId}:${userId}`;
          await redisClient.del(key);
          socket
            .to(`conversation:${payload.conversationId}`)
            .emit('typing:stop', {
              conversationId: payload.conversationId,
              userId,
            });
        } catch (err) {
          logger.error('typing:stop error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    );
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

