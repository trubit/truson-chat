import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { GroupJoinRequestModel, GroupMemberModel } from '../../../database/models/index.js';
import { groupRepository } from '../../groups/repository/index.js';
import type { IGroupJoinRequest } from '../../../database/models/GroupJoinRequest.js';
import type { GroupJoinRequestSummary } from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toSummary(r: IGroupJoinRequest): GroupJoinRequestSummary {
  const user = r.userId as unknown as { _id: mongoose.Types.ObjectId; displayName: string; avatarUrl?: string } | mongoose.Types.ObjectId;
  const hasUser = typeof user === 'object' && 'displayName' in user;
  return {
    _id:          r._id.toString(),
    groupId:      r.groupId.toString(),
    userId:       hasUser ? (user as { _id: mongoose.Types.ObjectId })._id.toString() : user.toString(),
    status:       r.status,
    message:      r.message,
    reviewedBy:   r.reviewedBy?.toString(),
    reviewedAt:   r.reviewedAt?.toISOString(),
    rejectReason: r.rejectReason,
    createdAt:    r.createdAt.toISOString(),
    user: hasUser ? {
      _id:         (user as { _id: mongoose.Types.ObjectId })._id.toString(),
      displayName: (user as { displayName: string }).displayName,
      avatarUrl:   (user as { avatarUrl?: string }).avatarUrl,
    } : undefined,
  };
}

// ---------------------------------------------------------------------------
// GroupJoinRequestService
// ---------------------------------------------------------------------------

export class GroupJoinRequestService {

  async requestToJoin(userId: string, groupId: string, message?: string): Promise<GroupJoinRequestSummary> {
    const group = await groupRepository.findById(groupId);
    if (!group || group.deletedAt) throw new AppError('Group not found', 404, 'NOT_FOUND');

    if (group.type === 'public' && !group.settings.joinApprovalRequired) {
      throw new AppError('This group is open — join directly', 400, 'OPEN_GROUP');
    }

    const existing = await groupRepository.findMember(groupId, userId);
    if (existing && existing.status === 'active') throw new AppError('Already a member', 409, 'ALREADY_MEMBER');

    // Check for an existing pending request
    const existingReq = await GroupJoinRequestModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId:  new mongoose.Types.ObjectId(userId),
      status:  'pending',
    }).exec();
    if (existingReq) throw new AppError('A pending request already exists', 409, 'REQUEST_EXISTS');

    const req = await GroupJoinRequestModel.create({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId:  new mongoose.Types.ObjectId(userId),
      status:  'pending',
      message,
    });

    return toSummary(req);
  }

  async getPendingRequests(actorId: string, groupId: string, opts: { page: number; limit: number }): Promise<{ requests: GroupJoinRequestSummary[]; total: number; hasMore: boolean }> {
    const membership = await groupRepository.findMember(groupId, actorId);
    if (!membership || !['owner', 'admin', 'moderator'].includes(membership.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const skip  = (opts.page - 1) * opts.limit;
    const filter = { groupId: new mongoose.Types.ObjectId(groupId), status: 'pending' as import('../../../database/models/GroupJoinRequest.js').JoinRequestStatus };
    const [docs, total] = await Promise.all([
      GroupJoinRequestModel.find(filter)
        .populate('userId', 'displayName avatarUrl')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(opts.limit)
        .exec(),
      GroupJoinRequestModel.countDocuments(filter).exec(),
    ]);

    return {
      requests: docs.map(toSummary),
      total,
      hasMore: total > opts.page * opts.limit,
    };
  }

  async reviewRequest(actorId: string, requestId: string, action: 'approve' | 'reject', rejectReason?: string): Promise<GroupJoinRequestSummary> {
    const req = await GroupJoinRequestModel.findById(new mongoose.Types.ObjectId(requestId)).exec();
    if (!req || req.status !== 'pending') throw new AppError('Request not found or already reviewed', 404, 'NOT_FOUND');

    const membership = await groupRepository.findMember(req.groupId.toString(), actorId);
    if (!membership || !['owner', 'admin', 'moderator'].includes(membership.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }

    const status   = action === 'approve' ? 'approved' : 'rejected';
    const reviewed = await GroupJoinRequestModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(requestId),
      {
        $set: {
          status,
          reviewedBy:   new mongoose.Types.ObjectId(actorId),
          reviewedAt:   new Date(),
          rejectReason: action === 'reject' ? rejectReason : undefined,
        },
      },
      { returnDocument: 'after' },
    ).exec();

    if (!reviewed) throw new AppError('Request not found', 404, 'NOT_FOUND');

    if (action === 'approve') {
      const group = await groupRepository.findById(req.groupId.toString());
      if (!group || group.deletedAt) throw new AppError('Group no longer exists', 404, 'NOT_FOUND');
      if (group.memberCount >= group.maxMembers) throw new AppError('Group is full', 409, 'GROUP_FULL');

      const existing = await groupRepository.findMember(req.groupId.toString(), req.userId.toString());
      if (existing) {
        await GroupMemberModel.findByIdAndUpdate(existing._id, { $set: { status: 'active', leftAt: null } }).exec();
      } else {
        await groupRepository.addMember({ groupId: req.groupId.toString(), userId: req.userId.toString(), role: 'member', addedBy: actorId });
        await groupRepository.incrementMemberCount(req.groupId.toString(), 1);
      }
    }

    return toSummary(reviewed);
  }

  async cancelRequest(userId: string, requestId: string): Promise<void> {
    const req = await GroupJoinRequestModel.findById(new mongoose.Types.ObjectId(requestId)).exec();
    if (!req) throw new AppError('Request not found', 404, 'NOT_FOUND');
    if (req.userId.toString() !== userId) throw new AppError('Cannot cancel another user\'s request', 403, 'FORBIDDEN');
    if (req.status !== 'pending') throw new AppError('Request has already been reviewed', 400, 'BAD_REQUEST');

    await GroupJoinRequestModel.findByIdAndUpdate(new mongoose.Types.ObjectId(requestId), {
      $set: { status: 'cancelled' },
    }).exec();
  }
}

export const groupJoinRequestService = new GroupJoinRequestService();
