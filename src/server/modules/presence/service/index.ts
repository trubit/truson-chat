import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { redisClient } from '../../../redis/connection.js';
import { PresenceModel } from '../../../database/models/Presence.js';
import type { PresenceRepository } from '../repository/index.js';
import type {
  IPresenceData,
  PublicPresenceData,
  UpdatePresenceDto,
  PresenceStatus,
} from '../types/index.js';
import type { IPresence } from '../../../database/models/Presence.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESENCE_TTL = 300; // 5 minutes in seconds
const ONLINE_USERS_KEY = 'online_users';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIPresenceData(p: IPresence): IPresenceData {
  return {
    userId: p.userId.toString(),
    status: p.status,
    customStatus: p.customStatus,
    statusMessage: p.statusMessage,
    statusExpiresAt: p.statusExpiresAt?.toISOString(),
    lastSeen: p.lastSeen.toISOString(),
  };
}

function toPublicPresenceData(p: IPresence, requesterId: string): PublicPresenceData {
  const isSelf = p.userId.toString() === requesterId;
  const effectiveStatus: PresenceStatus =
    !isSelf && p.status === 'invisible' ? 'offline' : p.status;
  return {
    userId: p.userId.toString(),
    status: effectiveStatus,
    lastSeen: p.lastSeen.toISOString(),
    customStatus: p.customStatus,
    statusMessage: p.statusMessage,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PresenceService {
  constructor(private repo: PresenceRepository) {}

  async getOwnPresence(userId: string): Promise<IPresenceData> {
    const presence = await this.repo.upsert(userId, {});
    return toIPresenceData(presence);
  }

  async getPresence(requesterId: string, targetUserId: string): Promise<PublicPresenceData> {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }
    const presence = await this.repo.findByUserId(targetUserId);
    if (!presence) {
      return {
        userId: targetUserId,
        status: 'offline',
        lastSeen: new Date().toISOString(),
      };
    }
    return toPublicPresenceData(presence, requesterId);
  }

  async getMultiplePresences(
    requesterId: string,
    userIds: string[],
  ): Promise<PublicPresenceData[]> {
    const presences = await this.repo.findManyByUserIds(userIds);
    const presenceMap = new Map(presences.map((p) => [p.userId.toString(), p]));
    return userIds.map((uid) => {
      const p = presenceMap.get(uid);
      if (!p) {
        return {
          userId: uid,
          status: 'offline' as PresenceStatus,
          lastSeen: new Date().toISOString(),
        };
      }
      return toPublicPresenceData(p, requesterId);
    });
  }

  async updatePresence(userId: string, dto: UpdatePresenceDto): Promise<IPresenceData> {
    const setFields: Record<string, unknown> = {};
    const unsetFields: Record<string, unknown> = {};

    if (dto.status !== undefined) setFields['status'] = dto.status;

    if (dto.customStatus === null) {
      unsetFields['customStatus'] = '';
    } else if (dto.customStatus !== undefined) {
      setFields['customStatus'] = dto.customStatus;
    }

    if (dto.statusMessage === null) {
      unsetFields['statusMessage'] = '';
    } else if (dto.statusMessage !== undefined) {
      setFields['statusMessage'] = dto.statusMessage;
    }

    if (dto.statusExpiresAt === null) {
      unsetFields['statusExpiresAt'] = '';
    } else if (dto.statusExpiresAt !== undefined) {
      setFields['statusExpiresAt'] = new Date(dto.statusExpiresAt);
    }

    if (dto.status === 'offline' || dto.status === 'invisible') {
      setFields['lastSeen'] = new Date();
    }

    const updateDoc: Record<string, unknown> = {};
    if (Object.keys(setFields).length > 0) updateDoc['$set'] = setFields;
    if (Object.keys(unsetFields).length > 0) updateDoc['$unset'] = unsetFields;
    if (Object.keys(updateDoc).length === 0) updateDoc['$set'] = {};

    const result = await PresenceModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      updateDoc,
      { upsert: true, returnDocument: 'after' },
    ).exec();

    if (!result) throw new AppError('Failed to update presence', 500, 'PRESENCE_UPDATE_FAILED');

    // Redis side effects — graceful degradation on failure
    try {
      const status = result.status;
      const redisKey = `presence:${userId}`;
      if (status === 'online' || status === 'away' || status === 'busy') {
        await redisClient.setex(
          redisKey,
          PRESENCE_TTL,
          JSON.stringify({ status, updatedAt: new Date().toISOString() }),
        );
        await redisClient.sadd(ONLINE_USERS_KEY, userId);
      } else {
        await redisClient.del(redisKey);
        await redisClient.srem(ONLINE_USERS_KEY, userId);
      }
    } catch {
      // Redis unavailable — degrade gracefully
    }

    return toIPresenceData(result);
  }

  async setUserOnline(userId: string): Promise<void> {
    await this.repo.upsert(userId, { status: 'online', lastSeen: new Date() });
    try {
      await redisClient.setex(
        `presence:${userId}`,
        PRESENCE_TTL,
        JSON.stringify({ status: 'online', updatedAt: new Date().toISOString() }),
      );
      await redisClient.sadd(ONLINE_USERS_KEY, userId);
    } catch {
      // Redis unavailable — degrade gracefully
    }
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.repo.setOffline(userId);
    try {
      await redisClient.del(`presence:${userId}`);
      await redisClient.srem(ONLINE_USERS_KEY, userId);
    } catch {
      // Redis unavailable — degrade gracefully
    }
  }

  async getOnlineUserIds(): Promise<string[]> {
    try {
      return await redisClient.smembers(ONLINE_USERS_KEY);
    } catch {
      return [];
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const result = await redisClient.sismember(ONLINE_USERS_KEY, userId);
      return result === 1;
    } catch {
      return false;
    }
  }

  async getOnlineFriendsPresence(
    requesterId: string,
    friendIds: string[],
  ): Promise<PublicPresenceData[]> {
    try {
      const pipeline = redisClient.pipeline();
      for (const fid of friendIds) {
        pipeline.sismember(ONLINE_USERS_KEY, fid);
      }
      const results = await pipeline.exec();
      const onlineIds = friendIds.filter((_, i) => {
        const entry = results?.[i];
        return entry != null && entry[1] === 1;
      });
      if (onlineIds.length === 0) return [];
      const presences = await this.repo.findManyByUserIds(onlineIds);
      return presences.map((p) => toPublicPresenceData(p, requesterId));
    } catch {
      return [];
    }
  }
}
