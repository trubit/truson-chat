import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import {
  GroupMemberModel, GroupBanModel, GroupMuteModel, ProfileModel,
} from '../../../database/models/index.js';
import { groupRepository } from '../../groups/repository/index.js';
import { MEMBER_ROLES } from '../../../../shared/constants/roles.js';
import type { IGroupMember }  from '../../../database/models/GroupMember.js';
import type { GroupMemberSummary, GroupMemberRole } from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Types for populated data
// ---------------------------------------------------------------------------

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  username?: string;
}

interface ProfileInfo {
  displayName: string;
  avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Helper — extract userId string from a raw or populated userId field
// ---------------------------------------------------------------------------

function extractUserId(rawUserId: unknown): string {
  if (typeof rawUserId === 'object' && rawUserId !== null && '_id' in rawUserId) {
    return (rawUserId as PopulatedUser)._id.toString();
  }
  return String(rawUserId);
}

function extractUsername(rawUserId: unknown): string | undefined {
  if (typeof rawUserId === 'object' && rawUserId !== null && 'username' in rawUserId) {
    return (rawUserId as PopulatedUser).username;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// buildSummary — assemble a GroupMemberSummary with real profile data
// ---------------------------------------------------------------------------

function buildSummary(m: IGroupMember, profile?: ProfileInfo): GroupMemberSummary {
  const userId   = extractUserId(m.userId);
  const username = extractUsername(m.userId);

  return {
    _id:         m._id.toString(),
    groupId:     m.groupId.toString(),
    userId,
    role:        m.role,
    customTitle: m.customTitle,
    status:      m.status as 'active' | 'muted' | 'banned',
    joinedAt:    m.joinedAt.toISOString(),
    mutedUntil:  m.mutedUntil?.toISOString(),
    lastReadAt:  m.lastReadAt?.toISOString(),
    // Use Profile.displayName first, fall back to username, then empty string
    displayName: profile?.displayName ?? username ?? '',
    username,
    avatarUrl:   profile?.avatarUrl,
  };
}

// ---------------------------------------------------------------------------
// Batch-fetch profiles and return a Map<userId, ProfileInfo>
// ---------------------------------------------------------------------------

async function fetchProfiles(userIds: mongoose.Types.ObjectId[]): Promise<Map<string, ProfileInfo>> {
  if (userIds.length === 0) return new Map();

  const profiles = await ProfileModel
    .find({ userId: { $in: userIds } })
    .select('userId displayName avatar')
    .lean()
    .exec();

  return new Map(
    profiles.map((p) => [
      (p.userId as mongoose.Types.ObjectId).toString(),
      { displayName: p.displayName as string, avatarUrl: (p.avatar as { url?: string } | undefined)?.url },
    ]),
  );
}

// ---------------------------------------------------------------------------
// GroupMemberService
// ---------------------------------------------------------------------------

export class GroupMemberService {

  async getMembers(viewerId: string, groupId: string, opts: { page: number; limit: number; role?: string }): Promise<{ members: GroupMemberSummary[]; total: number; hasMore: boolean }> {
    const viewing = await groupRepository.findMember(groupId, viewerId);
    if (!viewing || viewing.status !== 'active') throw new AppError('Not a member', 403, 'NOT_MEMBER');

    const filter: Record<string, unknown> = {
      groupId: new mongoose.Types.ObjectId(groupId),
      status:  'active',
    };
    if (opts.role) filter['role'] = opts.role;

    const skip  = (opts.page - 1) * opts.limit;
    const [docs, total] = await Promise.all([
      GroupMemberModel.find(filter)
        .populate('userId', 'username')        // User model only has username
        .sort({ joinedAt: 1 })
        .skip(skip)
        .limit(opts.limit)
        .exec(),
      GroupMemberModel.countDocuments(filter).exec(),
    ]);

    // Collect user ObjectIds so we can batch-fetch profiles
    const userObjectIds = docs.map((d) => {
      const raw = d.userId as unknown;
      if (typeof raw === 'object' && raw !== null && '_id' in raw) {
        return (raw as PopulatedUser)._id;
      }
      return new mongoose.Types.ObjectId(String(raw));
    });

    const profileMap = await fetchProfiles(userObjectIds);

    return {
      members: docs.map((d) => buildSummary(d, profileMap.get(extractUserId(d.userId)))),
      total,
      hasMore: total > opts.page * opts.limit,
    };
  }

  async updateRole(actorId: string, groupId: string, targetUserId: string, role: GroupMemberRole): Promise<GroupMemberSummary> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const target = await groupRepository.findMember(groupId, targetUserId);
    if (!target || target.status !== 'active') throw new AppError('Member not found', 404, 'NOT_FOUND');

    if (target.role === MEMBER_ROLES.OWNER) throw new AppError('Cannot change owner role', 400, 'CANNOT_CHANGE_OWNER');
    if (role === MEMBER_ROLES.OWNER && actor.role !== MEMBER_ROLES.OWNER) throw new AppError('Only the owner can transfer ownership', 403, 'FORBIDDEN');

    const updated = await GroupMemberModel.findByIdAndUpdate(
      target._id,
      { $set: { role } },
      { returnDocument: 'after' },
    ).populate('userId', 'username').exec();

    if (!updated) throw new AppError('Member not found', 404, 'NOT_FOUND');

    if (role === MEMBER_ROLES.OWNER) {
      await GroupMemberModel.findByIdAndUpdate(actor._id, { $set: { role: MEMBER_ROLES.ADMIN } }).exec();
    }

    const profileMap = await fetchProfiles([new mongoose.Types.ObjectId(targetUserId)]);
    return buildSummary(updated, profileMap.get(targetUserId));
  }

  async kickMember(actorId: string, groupId: string, targetUserId: string): Promise<void> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.MODERATOR] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const target = await groupRepository.findMember(groupId, targetUserId);
    if (!target || target.status !== 'active') throw new AppError('Member not found', 404, 'NOT_FOUND');
    if (target.role === MEMBER_ROLES.OWNER) throw new AppError('Cannot kick the group owner', 400, 'BAD_REQUEST');

    await groupRepository.removeMember(groupId, targetUserId);
    await groupRepository.incrementMemberCount(groupId, -1);
  }

  async banMember(actorId: string, groupId: string, targetUserId: string, opts: { reason?: string; expiresAt?: string }): Promise<void> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.MODERATOR] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const target = await groupRepository.findMember(groupId, targetUserId);
    if (target?.role === 'owner') throw new AppError('Cannot ban the group owner', 400, 'BAD_REQUEST');

    await GroupBanModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(targetUserId) },
      {
        $set: {
          bannedBy:  new mongoose.Types.ObjectId(actorId),
          reason:    opts.reason,
          expiresAt: opts.expiresAt ? new Date(opts.expiresAt) : undefined,
          liftedAt:  null,
          liftedBy:  undefined,
        },
      },
      { upsert: true },
    ).exec();

    if (target && target.status === 'active') {
      await groupRepository.removeMember(groupId, targetUserId);
      await groupRepository.incrementMemberCount(groupId, -1);
    }
  }

  async liftBan(actorId: string, groupId: string, targetUserId: string): Promise<void> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const ban = await GroupBanModel.findOne({
      groupId:  new mongoose.Types.ObjectId(groupId),
      userId:   new mongoose.Types.ObjectId(targetUserId),
      liftedAt: null,
    }).exec();

    if (!ban) throw new AppError('No active ban found', 404, 'NOT_FOUND');

    await GroupBanModel.findByIdAndUpdate(ban._id, {
      $set: { liftedAt: new Date(), liftedBy: new mongoose.Types.ObjectId(actorId) },
    }).exec();
  }

  async muteMember(actorId: string, groupId: string, targetUserId: string, opts: { expiresAt?: string }): Promise<void> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.MODERATOR] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const mutedUntil = opts.expiresAt ? new Date(opts.expiresAt) : null;

    await GroupMuteModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(targetUserId) },
      { $set: { mutedBy: new mongoose.Types.ObjectId(actorId), expiresAt: mutedUntil } },
      { upsert: true },
    ).exec();

    await GroupMemberModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(targetUserId) },
      { $set: { mutedUntil } },
    ).exec();
  }

  async unmuteMember(actorId: string, groupId: string, targetUserId: string): Promise<void> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.MODERATOR] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    await GroupMuteModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(targetUserId) },
      { $set: { expiresAt: new Date() } },
    ).exec();

    await GroupMemberModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(targetUserId) },
      { $unset: { mutedUntil: '' } },
    ).exec();
  }

  async addMember(actorId: string, groupId: string, targetUserId: string): Promise<GroupMemberSummary> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const existing = await groupRepository.findMember(groupId, targetUserId);
    if (existing && existing.status === 'active') throw new AppError('User is already a member', 400, 'ALREADY_MEMBER');

    const group = await groupRepository.findById(groupId);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (group.memberCount >= group.maxMembers) throw new AppError('Group is full', 400, 'GROUP_FULL');

    const member = await GroupMemberModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(targetUserId) },
      { $set: { role: MEMBER_ROLES.MEMBER, status: 'active', joinedAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    ).populate('userId', 'username').exec();

    if (!member) throw new AppError('Failed to add member', 500, 'INTERNAL_ERROR');
    await groupRepository.incrementMemberCount(groupId, 1);

    const profileMap = await fetchProfiles([new mongoose.Types.ObjectId(targetUserId)]);
    return buildSummary(member, profileMap.get(targetUserId));
  }

  async getBannedMembers(actorId: string, groupId: string): Promise<{ userId: string; reason?: string; bannedBy: string; expiresAt?: string }[]> {
    const actor = await groupRepository.findMember(groupId, actorId);
    if (!actor || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(actor.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const bans = await GroupBanModel.find({
      groupId:  new mongoose.Types.ObjectId(groupId),
      liftedAt: null,
    }).exec();

    return bans.map((b) => ({
      userId:    b.userId.toString(),
      reason:    b.reason,
      bannedBy:  b.bannedBy.toString(),
      expiresAt: b.expiresAt?.toISOString(),
    }));
  }
}

export const groupMemberService = new GroupMemberService();
