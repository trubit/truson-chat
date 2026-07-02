import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import type { BlockRepository, MuteRepository } from '../repository/index.js';
import type {
  IBlockData,
  IMuteData,
  BlockUserDto,
  MuteUserDto,
  BlockListQuery,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// BlockingService
// ---------------------------------------------------------------------------

export class BlockingService {
  constructor(
    private blockRepo: BlockRepository,
    private muteRepo: MuteRepository,
  ) {}

  private async populateBlockedUserInfo(
    userId: mongoose.Types.ObjectId,
  ): Promise<{ id: string; username: string; displayName: string; avatar?: string }> {
    const [user, profile] = await Promise.all([
      UserModel.findById(userId).select('username').exec(),
      ProfileModel.findOne({ userId }).select('displayName avatar').exec(),
    ]);
    return {
      id: userId.toString(),
      username: user?.username ?? '',
      displayName: profile?.displayName ?? '',
      avatar: profile?.avatar?.url,
    };
  }

  async blockUser(
    blockerId: string,
    targetUserId: string,
    dto: BlockUserDto,
  ): Promise<IBlockData> {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }
    if (blockerId === targetUserId) {
      throw new AppError('Cannot block yourself', 400, 'CANNOT_BLOCK_SELF');
    }
    const target = await UserModel.findById(new mongoose.Types.ObjectId(targetUserId))
      .select('_id')
      .exec();
    if (!target) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const already = await this.blockRepo.findByBlockerAndBlocked(blockerId, targetUserId);
    if (already) {
      throw new AppError('User already blocked', 409, 'ALREADY_BLOCKED');
    }
    const block = await this.blockRepo.create(blockerId, targetUserId, dto.reason);
    const userInfo = await this.populateBlockedUserInfo(block.blockedId);
    return {
      id: block._id.toString(),
      blockedUser: userInfo,
      reason: block.reason,
      createdAt: block.createdAt.toISOString(),
    };
  }

  async unblockUser(blockerId: string, targetUserId: string): Promise<void> {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }
    const existing = await this.blockRepo.findByBlockerAndBlocked(blockerId, targetUserId);
    if (!existing) {
      throw new AppError('Block not found', 404, 'BLOCK_NOT_FOUND');
    }
    await this.blockRepo.delete(blockerId, targetUserId);
  }

  async getBlockedUsers(
    blockerId: string,
    query: BlockListQuery,
  ): Promise<{
    blocks: IBlockData[];
    meta: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { blocks, total } = await this.blockRepo.findByBlocker(blockerId, page, limit);
    const blockData: IBlockData[] = await Promise.all(
      blocks.map(async (b) => {
        const userInfo = await this.populateBlockedUserInfo(b.blockedId);
        return {
          id: b._id.toString(),
          blockedUser: userInfo,
          reason: b.reason,
          createdAt: b.createdAt.toISOString(),
        };
      }),
    );
    return {
      blocks: blockData,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async isUserBlocked(blockerId: string, targetUserId: string): Promise<boolean> {
    return this.blockRepo.isBlocked(blockerId, targetUserId);
  }

  async isBlockedEitherDirection(user1Id: string, user2Id: string): Promise<boolean> {
    return this.blockRepo.isBlockedEitherDirection(user1Id, user2Id);
  }

  async muteUser(
    muterId: string,
    targetUserId: string,
    dto: MuteUserDto,
  ): Promise<IMuteData> {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }
    if (muterId === targetUserId) {
      throw new AppError('Cannot mute yourself', 400, 'CANNOT_MUTE_SELF');
    }
    const target = await UserModel.findById(new mongoose.Types.ObjectId(targetUserId))
      .select('_id')
      .exec();
    if (!target) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const existing = await this.muteRepo.findByMuterAndMuted(muterId, targetUserId);
    let mute;
    if (existing) {
      mute = await this.muteRepo.update(muterId, targetUserId, dto);
      if (!mute) throw new AppError('Failed to update mute', 500, 'MUTE_UPDATE_FAILED');
    } else {
      mute = await this.muteRepo.create(muterId, targetUserId, dto);
    }
    const userInfo = await this.populateBlockedUserInfo(mute.mutedId);
    return {
      id: mute._id.toString(),
      mutedUser: userInfo,
      mutedNotifications: mute.mutedNotifications,
      mutedMessages: mute.mutedMessages,
      expiresAt: mute.expiresAt?.toISOString(),
      createdAt: mute.createdAt.toISOString(),
    };
  }

  async unmuteUser(muterId: string, targetUserId: string): Promise<void> {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_ID');
    }
    const existing = await this.muteRepo.findByMuterAndMuted(muterId, targetUserId);
    if (!existing) {
      throw new AppError('Mute not found', 404, 'MUTE_NOT_FOUND');
    }
    await this.muteRepo.delete(muterId, targetUserId);
  }

  async getMutedUsers(
    muterId: string,
    query: BlockListQuery,
  ): Promise<{
    mutes: IMuteData[];
    meta: { page: number; limit: number; total: number; hasMore: boolean };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { mutes, total } = await this.muteRepo.findByMuter(muterId, page, limit);
    const muteData: IMuteData[] = await Promise.all(
      mutes.map(async (m) => {
        const userInfo = await this.populateBlockedUserInfo(m.mutedId);
        return {
          id: m._id.toString(),
          mutedUser: userInfo,
          mutedNotifications: m.mutedNotifications,
          mutedMessages: m.mutedMessages,
          expiresAt: m.expiresAt?.toISOString(),
          createdAt: m.createdAt.toISOString(),
        };
      }),
    );
    return {
      mutes: muteData,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async isUserMuted(muterId: string, targetUserId: string): Promise<boolean> {
    return this.muteRepo.isMuted(muterId, targetUserId);
  }
}
