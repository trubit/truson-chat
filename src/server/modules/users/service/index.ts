import { ProfileModel } from '../../../database/models/Profile.js';
import { AppError } from '../../../middlewares/errorHandler.js';
import { logger } from '../../../logger/index.js';
import { USER_ROLES } from '../../../../shared/constants/roles.js';
import type { PaginationMeta } from '../../../../shared/types/api.js';
import type {
  UserListQuery,
  PublicUserProfile,
  AdminUserView,
  UpdateUserInput,
  UpdateStatusInput,
} from '../types/index.js';
import type { UsersRepository } from '../repository/index.js';
import type { IUser } from '../../../database/models/User.js';
import type { IProfile } from '../../../database/models/Profile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAdminUserView(user: IUser): AdminUserView {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    loginAttempts: user.loginAttempts,
    lastSeen: user.lastSeen?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

function toPublicUserProfile(user: IUser, profile: IProfile | null): PublicUserProfile {
  const result: PublicUserProfile = {
    id: user._id.toString(),
    username: user.username,
    displayName: profile?.displayName ?? user.username,
    role: user.role,
  };

  if (profile?.avatar) {
    result.avatar = profile.avatar;
  }

  if (user.lastSeen) {
    result.lastSeen = user.lastSeen.toISOString();
  }

  return result;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UsersService {
  constructor(private repo: UsersRepository) {}

  async getUserById(
    _requesterId: string,
    requesterRole: string,
    targetId: string,
  ): Promise<PublicUserProfile | AdminUserView> {
    const user = await this.repo.findById(targetId);

    if (!user || user.status === 'deleted') {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (requesterRole === USER_ROLES.ADMIN) {
      return toAdminUserView(user);
    }

    // Regular users get public profile (with display name from profile)
    const profile = await ProfileModel.findOne({
      userId: user._id,
    }).exec();

    return toPublicUserProfile(user, profile);
  }

  async listUsers(
    _requesterId: string,
    requesterRole: string,
    query: UserListQuery,
  ): Promise<{ users: AdminUserView[]; meta: PaginationMeta }> {
    if (requesterRole !== USER_ROLES.ADMIN) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { users, total } = await this.repo.findMany(query);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };

    return {
      users: users.map(toAdminUserView),
      meta,
    };
  }

  async updateUser(
    requesterId: string,
    requesterRole: string,
    targetId: string,
    data: UpdateUserInput,
    ip: string,
    ua: string,
  ): Promise<AdminUserView> {
    // Authorization: non-admin can only update their own account
    if (requesterRole !== USER_ROLES.ADMIN && requesterId !== targetId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const existing = await this.repo.findById(targetId);
    if (!existing || existing.status === 'deleted') {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updateData: Partial<Pick<IUser, 'username' | 'phone'>> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.phone !== undefined) {
      // Empty string removes the phone
      if (data.phone === '') {
        // Use $unset for removal — handled via direct update
        await existing.updateOne({ $unset: { phone: '' } });
        const updated = await this.repo.findById(targetId);
        if (!updated) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

        await this.repo.logAudit({
          userId: requesterId,
          action: 'user.update',
          resource: 'user',
          resourceId: targetId,
          changes: {
            before: { phone: existing.phone },
            after: { phone: undefined },
          },
          ipAddress: ip,
          userAgent: ua,
        });

        logger.info('User updated (phone removed)', { requesterId, targetId });
        return toAdminUserView(updated);
      }
      updateData.phone = data.phone;
    }

    const before: Partial<Pick<IUser, 'username' | 'phone'>> = {};
    if (updateData.username !== undefined) before.username = existing.username;
    if (updateData.phone !== undefined) before.phone = existing.phone;

    const updated = await this.repo.updateUser(targetId, updateData);
    if (!updated) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await this.repo.logAudit({
      userId: requesterId,
      action: 'user.update',
      resource: 'user',
      resourceId: targetId,
      changes: { before, after: updateData },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('User updated', { requesterId, targetId, fields: Object.keys(updateData) });
    return toAdminUserView(updated);
  }

  async deleteUser(
    requesterId: string,
    requesterRole: string,
    targetId: string,
    ip: string,
    ua: string,
  ): Promise<void> {
    // Authorization: non-admin can only delete their own account
    if (requesterRole !== USER_ROLES.ADMIN && requesterId !== targetId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const existing = await this.repo.findById(targetId);
    if (!existing || existing.status === 'deleted') {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await this.repo.softDeleteUser(targetId);

    await this.repo.logAudit({
      userId: requesterId,
      action: 'user.delete',
      resource: 'user',
      resourceId: targetId,
      changes: {
        before: { status: existing.status },
        after: { status: 'deleted' },
      },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('User soft-deleted', { requesterId, targetId });
  }

  async updateUserStatus(
    requesterId: string,
    targetId: string,
    data: UpdateStatusInput,
    ip: string,
    ua: string,
  ): Promise<AdminUserView> {
    // Admin-only — caller must have verified role before calling
    const existing = await this.repo.findById(targetId);
    if (!existing || existing.status === 'deleted') {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const updated = await this.repo.updateStatus(targetId, data.status, data.reason);
    if (!updated) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

    await this.repo.logAudit({
      userId: requesterId,
      action: 'user.status_change',
      resource: 'user',
      resourceId: targetId,
      changes: {
        before: { status: existing.status },
        after: { status: data.status, reason: data.reason },
      },
      ipAddress: ip,
      userAgent: ua,
    });

    logger.info('User status updated', {
      requesterId,
      targetId,
      from: existing.status,
      to: data.status,
    });

    return toAdminUserView(updated);
  }

  async updateLastSeen(userId: string): Promise<void> {
    await this.repo.updateUser(userId, { lastSeen: new Date() });
  }

  async searchUsers(query: string, limit = 10): Promise<PublicUserProfile[]> {
    const { users } = await this.repo.findMany({
      search: query,
      limit,
      page: 1,
      status: 'active',
    });

    // Fetch profiles for display names / avatars
    const userIds = users.map((u) => u._id);
    const profiles = await ProfileModel.find({ userId: { $in: userIds } }).exec();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return users.map((user) => {
      const profile = profileMap.get(user._id.toString()) ?? null;
      return toPublicUserProfile(user, profile);
    });
  }
}
