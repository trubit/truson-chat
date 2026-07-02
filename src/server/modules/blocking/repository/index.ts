import mongoose from 'mongoose';
import { BlockedUserModel, type IBlockedUser } from '../../../database/models/BlockedUser.js';
import { MutedUserModel, type IMutedUser } from '../../../database/models/MutedUser.js';
import type { MuteUserDto } from '../types/index.js';

// ---------------------------------------------------------------------------
// BlockRepository
// ---------------------------------------------------------------------------

export class BlockRepository {
  async create(blockerId: string, blockedId: string, reason?: string): Promise<IBlockedUser> {
    const doc = await BlockedUserModel.create({
      blockerId: new mongoose.Types.ObjectId(blockerId),
      blockedId: new mongoose.Types.ObjectId(blockedId),
      reason,
    });
    return doc;
  }

  async findByBlockerAndBlocked(
    blockerId: string,
    blockedId: string,
  ): Promise<IBlockedUser | null> {
    if (!mongoose.isValidObjectId(blockerId) || !mongoose.isValidObjectId(blockedId)) return null;
    return BlockedUserModel.findOne({
      blockerId: new mongoose.Types.ObjectId(blockerId),
      blockedId: new mongoose.Types.ObjectId(blockedId),
    }).exec();
  }

  async findByBlocker(
    blockerId: string,
    page: number,
    limit: number,
  ): Promise<{ blocks: IBlockedUser[]; total: number }> {
    if (!mongoose.isValidObjectId(blockerId)) return { blocks: [], total: 0 };
    const filter = { blockerId: new mongoose.Types.ObjectId(blockerId) };
    const [blocks, total] = await Promise.all([
      BlockedUserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      BlockedUserModel.countDocuments(filter).exec(),
    ]);
    return { blocks, total };
  }

  async delete(blockerId: string, blockedId: string): Promise<void> {
    if (!mongoose.isValidObjectId(blockerId) || !mongoose.isValidObjectId(blockedId)) return;
    await BlockedUserModel.deleteOne({
      blockerId: new mongoose.Types.ObjectId(blockerId),
      blockedId: new mongoose.Types.ObjectId(blockedId),
    }).exec();
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(blockerId) || !mongoose.isValidObjectId(blockedId)) return false;
    const doc = await BlockedUserModel.findOne({
      blockerId: new mongoose.Types.ObjectId(blockerId),
      blockedId: new mongoose.Types.ObjectId(blockedId),
    })
      .select('_id')
      .exec();
    return doc !== null;
  }

  async getBlockedIds(blockerId: string): Promise<string[]> {
    if (!mongoose.isValidObjectId(blockerId)) return [];
    const docs = await BlockedUserModel.find({
      blockerId: new mongoose.Types.ObjectId(blockerId),
    })
      .select('blockedId')
      .exec();
    return docs.map((d) => d.blockedId.toString());
  }

  async isBlockedEitherDirection(user1Id: string, user2Id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(user1Id) || !mongoose.isValidObjectId(user2Id)) return false;
    const doc = await BlockedUserModel.findOne({
      $or: [
        {
          blockerId: new mongoose.Types.ObjectId(user1Id),
          blockedId: new mongoose.Types.ObjectId(user2Id),
        },
        {
          blockerId: new mongoose.Types.ObjectId(user2Id),
          blockedId: new mongoose.Types.ObjectId(user1Id),
        },
      ],
    })
      .select('_id')
      .exec();
    return doc !== null;
  }
}

// ---------------------------------------------------------------------------
// MuteRepository
// ---------------------------------------------------------------------------

export class MuteRepository {
  async create(muterId: string, mutedId: string, dto: MuteUserDto): Promise<IMutedUser> {
    const doc = await MutedUserModel.create({
      muterId: new mongoose.Types.ObjectId(muterId),
      mutedId: new mongoose.Types.ObjectId(mutedId),
      mutedNotifications: dto.mutedNotifications ?? true,
      mutedMessages: dto.mutedMessages ?? true,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    return doc;
  }

  async findByMuterAndMuted(muterId: string, mutedId: string): Promise<IMutedUser | null> {
    if (!mongoose.isValidObjectId(muterId) || !mongoose.isValidObjectId(mutedId)) return null;
    return MutedUserModel.findOne({
      muterId: new mongoose.Types.ObjectId(muterId),
      mutedId: new mongoose.Types.ObjectId(mutedId),
    }).exec();
  }

  async findByMuter(
    muterId: string,
    page: number,
    limit: number,
  ): Promise<{ mutes: IMutedUser[]; total: number }> {
    if (!mongoose.isValidObjectId(muterId)) return { mutes: [], total: 0 };
    const filter = { muterId: new mongoose.Types.ObjectId(muterId) };
    const [mutes, total] = await Promise.all([
      MutedUserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      MutedUserModel.countDocuments(filter).exec(),
    ]);
    return { mutes, total };
  }

  async update(muterId: string, mutedId: string, dto: MuteUserDto): Promise<IMutedUser | null> {
    if (!mongoose.isValidObjectId(muterId) || !mongoose.isValidObjectId(mutedId)) return null;
    const setFields: Record<string, unknown> = {};
    if (dto.mutedNotifications !== undefined) {
      setFields['mutedNotifications'] = dto.mutedNotifications;
    }
    if (dto.mutedMessages !== undefined) {
      setFields['mutedMessages'] = dto.mutedMessages;
    }
    if (dto.expiresAt !== undefined) {
      if (dto.expiresAt === null) {
        // Use $unset for null — handled below
      } else {
        setFields['expiresAt'] = new Date(dto.expiresAt);
      }
    }

    const updateDoc: Record<string, unknown> = {};
    if (Object.keys(setFields).length > 0) {
      updateDoc['$set'] = setFields;
    }
    if (dto.expiresAt === null) {
      updateDoc['$unset'] = { expiresAt: '' };
    }

    if (Object.keys(updateDoc).length === 0) {
      updateDoc['$set'] = {};
    }

    return MutedUserModel.findOneAndUpdate(
      {
        muterId: new mongoose.Types.ObjectId(muterId),
        mutedId: new mongoose.Types.ObjectId(mutedId),
      },
      updateDoc,
      { returnDocument: 'after' },
    ).exec();
  }

  async delete(muterId: string, mutedId: string): Promise<void> {
    if (!mongoose.isValidObjectId(muterId) || !mongoose.isValidObjectId(mutedId)) return;
    await MutedUserModel.deleteOne({
      muterId: new mongoose.Types.ObjectId(muterId),
      mutedId: new mongoose.Types.ObjectId(mutedId),
    }).exec();
  }

  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(muterId) || !mongoose.isValidObjectId(mutedId)) return false;
    const doc = await MutedUserModel.findOne({
      muterId: new mongoose.Types.ObjectId(muterId),
      mutedId: new mongoose.Types.ObjectId(mutedId),
    })
      .select('_id')
      .exec();
    return doc !== null;
  }

  async getMutedIds(muterId: string): Promise<string[]> {
    if (!mongoose.isValidObjectId(muterId)) return [];
    const docs = await MutedUserModel.find({
      muterId: new mongoose.Types.ObjectId(muterId),
    })
      .select('mutedId')
      .exec();
    return docs.map((d) => d.mutedId.toString());
  }
}
