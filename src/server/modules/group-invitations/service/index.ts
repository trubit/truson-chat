import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { AppError } from '../../../middlewares/errorHandler.js';
import {
  GroupInvitationModel,
  GroupMemberModel,
  GroupModel,
} from '../../../database/models/index.js';
import { groupRepository } from '../../groups/repository/index.js';
import type { IGroupInvitation } from '../../../database/models/GroupInvitation.js';
import type {
  GroupInvitationSummary,
  CreateInvitePayload,
} from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toSummary(inv: IGroupInvitation): GroupInvitationSummary {
  return {
    _id: inv._id.toString(),
    groupId: inv.groupId.toString(),
    type: inv.type,
    status: inv.status,
    token: inv.token,
    invitedBy: inv.createdBy.toString(),
    inviteeId: inv.inviteeId?.toString(),
    maxUses: inv.maxUses,
    usedCount: inv.usedCount,
    expiresAt: inv.expiresAt?.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GroupInvitationService
// ---------------------------------------------------------------------------

export class GroupInvitationService {
  async createInvite(userId: string, dto: CreateInvitePayload): Promise<GroupInvitationSummary> {
    const membership = await groupRepository.findMember(dto.groupId, userId);
    if (!membership || membership.status !== 'active')
      throw new AppError('Not a member', 403, 'NOT_MEMBER');
    if (!['owner', 'admin', 'moderator'].includes(membership.role))
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');

    const group = await groupRepository.findById(dto.groupId);
    if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND');

    // For direct invites — check invitee is not already a member
    if (dto.type === 'direct' && dto.inviteeId) {
      const existing = await groupRepository.findMember(dto.groupId, dto.inviteeId);
      if (existing && existing.status === 'active')
        throw new AppError('User is already a member', 409, 'ALREADY_MEMBER');
    }

    const inv = await GroupInvitationModel.create({
      groupId: new mongoose.Types.ObjectId(dto.groupId),
      createdBy: new mongoose.Types.ObjectId(userId),
      inviteeId: dto.inviteeId ? new mongoose.Types.ObjectId(dto.inviteeId) : undefined,
      type: dto.type,
      status: 'pending',
      token: randomUUID(),
      maxUses: dto.type === 'link' ? (dto.maxUses ?? 0) : 1,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    return toSummary(inv);
  }

  async getInvites(userId: string, groupId: string): Promise<GroupInvitationSummary[]> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || !['owner', 'admin', 'moderator'].includes(membership.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const docs = await GroupInvitationModel.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .exec();

    return docs.map(toSummary);
  }

  async revokeInvite(userId: string, inviteId: string): Promise<void> {
    const inv = await GroupInvitationModel.findById(new mongoose.Types.ObjectId(inviteId)).exec();
    if (!inv) throw new AppError('Invitation not found', 404, 'NOT_FOUND');

    const membership = await groupRepository.findMember(inv.groupId.toString(), userId);
    if (!membership || !['owner', 'admin', 'moderator'].includes(membership.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    await GroupInvitationModel.findByIdAndUpdate(new mongoose.Types.ObjectId(inviteId), {
      $set: { status: 'revoked' },
    }).exec();
  }

  async acceptInvite(userId: string, token: string): Promise<void> {
    const inv = await GroupInvitationModel.findOne({ token, status: 'pending' }).exec();
    if (!inv) throw new AppError('Invalid or expired invitation', 404, 'INVALID_INVITE');

    if (inv.expiresAt && inv.expiresAt < new Date()) {
      await GroupInvitationModel.findByIdAndUpdate(inv._id, { $set: { status: 'expired' } }).exec();
      throw new AppError('Invitation has expired', 410, 'INVITE_EXPIRED');
    }

    if (inv.maxUses !== null && inv.maxUses !== undefined && inv.usedCount >= inv.maxUses) {
      throw new AppError('Invitation has reached its usage limit', 410, 'INVITE_USED_UP');
    }

    // Direct invite — must be the intended recipient
    if (inv.type === 'direct' && inv.inviteeId && inv.inviteeId.toString() !== userId) {
      throw new AppError('This invitation is not for you', 403, 'FORBIDDEN');
    }

    const group = await GroupModel.findById(inv.groupId).exec();
    if (!group || group.deletedAt) throw new AppError('Group not found', 404, 'NOT_FOUND');

    // Check membership
    const existing = await groupRepository.findMember(inv.groupId.toString(), userId);
    if (existing && existing.status === 'active')
      throw new AppError('Already a member', 409, 'ALREADY_MEMBER');

    if (group.memberCount >= group.maxMembers)
      throw new AppError('Group is full', 409, 'GROUP_FULL');

    if (existing) {
      await GroupMemberModel.findByIdAndUpdate(existing._id, {
        $set: { status: 'active', leftAt: null },
      }).exec();
    } else {
      await groupRepository.addMember({
        groupId: inv.groupId.toString(),
        userId,
        role: 'member',
        addedBy: inv.createdBy.toString(),
      });
      await groupRepository.incrementMemberCount(inv.groupId.toString(), 1);
    }

    // Update invitation state
    const updates: Record<string, unknown> = { $inc: { usedCount: 1 } };
    if (inv.type === 'direct') updates['$set'] = { status: 'accepted' };
    await GroupInvitationModel.findByIdAndUpdate(inv._id, updates).exec();
  }
}

export const groupInvitationService = new GroupInvitationService();
