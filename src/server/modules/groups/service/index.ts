import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { GroupMemberModel, GroupBanModel, ProfileModel } from '../../../database/models/index.js';
import { groupRepository }     from '../repository/index.js';
import { MEMBER_ROLES } from '../../../../shared/constants/roles.js';
import type { IGroup }         from '../../../database/models/Group.js';
import type { IGroupMember }   from '../../../database/models/GroupMember.js';
import type { IGroupMessage }  from '../../../database/models/GroupMessage.js';
import type {
  CreateGroupDto, UpdateGroupDto, GroupQuery, GroupMessageQuery, SendGroupMessageDto,
} from '../types/index.js';
import type { GroupSummary, GroupDetail, GroupMessage } from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toGroupSummary(g: IGroup): GroupSummary {
  return {
    _id:           g._id.toString(),
    name:          g.name,
    handle:        g.handle,
    description:   g.description,
    type:          g.type,
    status:        g.status,
    avatar:        g.avatar,
    memberCount:   g.memberCount,
    communityId:   g.communityId?.toString(),
    lastMessageAt: g.lastMessageAt?.toISOString(),
    createdAt:     g.createdAt.toISOString(),
    updatedAt:     g.updatedAt.toISOString(),
  };
}

function toGroupDetail(g: IGroup, myMembership?: IGroupMember | null): GroupDetail {
  return {
    ...toGroupSummary(g),
    coverImage:       g.coverImage,
    maxMembers:       g.maxMembers,
    settings:         g.settings as unknown as GroupDetail['settings'],
    categories:       g.categories,
    tags:             g.tags,
    inviteLink:       g.inviteLink,
    inviteLinkExpiry: g.inviteLinkExpiry?.toISOString(),
    pinnedMessageIds: g.pinnedMessageIds.map((id) => id.toString()),
    createdBy:        g.createdBy.toString(),
    myMembership:     myMembership ? {
      _id:         myMembership._id.toString(),
      groupId:     myMembership.groupId.toString(),
      userId:      myMembership.userId.toString(),
      role:        myMembership.role,
      customTitle: myMembership.customTitle,
      status:      myMembership.status as 'active' | 'muted' | 'banned',
      joinedAt:    myMembership.joinedAt.toISOString(),
      mutedUntil:  myMembership.mutedUntil?.toISOString(),
      lastReadAt:  myMembership.lastReadAt?.toISOString(),
      displayName: '',
    } : null,
  };
}

// Resolved profile data keyed by userId string
type ProfileMap = Map<string, { displayName: string; avatarUrl?: string }>;

async function fetchProfileMap(userIds: string[]): Promise<ProfileMap> {
  if (userIds.length === 0) return new Map();
  const unique = [...new Set(userIds)].filter((id) => mongoose.Types.ObjectId.isValid(id));
  const profiles = await ProfileModel
    .find({ userId: { $in: unique.map((id) => new mongoose.Types.ObjectId(id)) } })
    .select('userId displayName avatar')
    .lean()
    .exec();
  return new Map(
    profiles.map((p) => [
      (p.userId as mongoose.Types.ObjectId).toString(),
      {
        displayName: p.displayName as string,
        avatarUrl:   (p.avatar as { url?: string } | undefined)?.url,
      },
    ]),
  );
}

function toGroupMessage(m: IGroupMessage, profileMap?: ProfileMap): GroupMessage {
  // senderId may be populated (has _id + username) or raw ObjectId
  const raw = m.senderId as unknown;
  const isPopulated = typeof raw === 'object' && raw !== null && '_id' in raw;

  const senderId = isPopulated
    ? (raw as { _id: mongoose.Types.ObjectId })._id.toString()
    : String(raw);
  const username = isPopulated
    ? (raw as { username?: string }).username
    : undefined;

  const profile = profileMap?.get(senderId);

  const senderObj = {
    _id:         senderId,
    displayName: profile?.displayName ?? username ?? senderId.slice(-6),
    avatarUrl:   profile?.avatarUrl,
  };

  return {
    _id:        m._id.toString(),
    groupId:    m.groupId.toString(),
    channelId:  m.channelId?.toString(),
    senderId,
    type:       m.type,
    content:    m.deletedAt ? '' : m.content,
    media:      m.deletedAt ? [] : m.media,
    replyTo:    m.replyTo?.toString(),
    mentions:   m.mentions.map((mn) => ({ userId: mn.userId.toString(), offset: mn.offset, length: mn.length })),
    reactions:  m.reactions.map((r) => ({ emoji: r.emoji, users: r.users.map((u) => u.toString()), count: r.count })),
    status:     m.status,
    isPinned:   m.isPinned,
    isEdited:   m.isEdited,
    editedAt:   m.editedAt?.toISOString(),
    deletedAt:  m.deletedAt?.toISOString(),
    readCount:  m.readCount,
    createdAt:  m.createdAt.toISOString(),
    updatedAt:  m.updatedAt.toISOString(),
    sender:     senderObj,
  };
}

// ---------------------------------------------------------------------------
// GroupService
// ---------------------------------------------------------------------------

export class GroupService {

  async createGroup(userId: string, dto: CreateGroupDto): Promise<GroupDetail> {
    if (dto.handle) {
      const existing = await groupRepository.findByHandle(dto.handle);
      if (existing) throw new AppError('Handle already taken', 409, 'HANDLE_TAKEN');
    }

    const group = await groupRepository.create({ ...dto, createdBy: userId });

    // Add creator as owner
    await groupRepository.addMember({ groupId: group._id.toString(), userId, role: MEMBER_ROLES.OWNER });

    const membership = await groupRepository.findMember(group._id.toString(), userId);
    return toGroupDetail(group, membership);
  }

  async getGroup(groupId: string, viewerId?: string): Promise<GroupDetail> {
    const group = await groupRepository.findById(groupId);
    if (!group || group.deletedAt) throw new AppError('Group not found', 404, 'NOT_FOUND');

    let membership: IGroupMember | null = null;
    if (viewerId) {
      membership = await groupRepository.findMember(groupId, viewerId);
    }

    if (group.type === 'private' && !membership) {
      throw new AppError('Group not found', 404, 'NOT_FOUND');
    }

    return toGroupDetail(group, membership);
  }

  async getMyGroups(userId: string, page: number, limit: number): Promise<{ groups: GroupSummary[]; total: number; hasMore: boolean }> {
    const { groups, total } = await groupRepository.findByUser(userId, { page, limit });
    return { groups: groups.map(toGroupSummary), total, hasMore: total > page * limit };
  }

  async discoverGroups(_userId: string, query: GroupQuery): Promise<{ groups: GroupSummary[]; total: number; hasMore: boolean }> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const { groups, total } = await groupRepository.findMany({ ...query, type: 'public', status: 'active' });
    return { groups: groups.map(toGroupSummary), total, hasMore: total > page * limit };
  }

  async updateGroup(userId: string, groupId: string, dto: UpdateGroupDto): Promise<GroupDetail> {
    await this.requirePermission(groupId, userId, 'manage_group');

    if (dto.handle) {
      const existing = await groupRepository.findByHandle(dto.handle);
      if (existing && existing._id.toString() !== groupId) {
        throw new AppError('Handle already taken', 409, 'HANDLE_TAKEN');
      }
    }

    const updated = await groupRepository.update(groupId, dto);
    if (!updated) throw new AppError('Group not found', 404, 'NOT_FOUND');

    const membership = await groupRepository.findMember(groupId, userId);
    return toGroupDetail(updated, membership);
  }

  async deleteGroup(userId: string, groupId: string): Promise<void> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.role !== MEMBER_ROLES.OWNER) {
      throw new AppError('Only the owner can delete a group', 403, 'FORBIDDEN');
    }
    await groupRepository.softDelete(groupId);
  }

  async joinGroup(userId: string, groupId: string): Promise<void> {
    const group = await groupRepository.findById(groupId);
    if (!group || group.deletedAt) throw new AppError('Group not found', 404, 'NOT_FOUND');
    if (group.type === 'private') throw new AppError('This group requires an invite', 403, 'INVITE_REQUIRED');

    // Check ban
    const ban = await GroupBanModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId:  new mongoose.Types.ObjectId(userId),
      liftedAt: null,
    }).exec();
    if (ban && (!ban.expiresAt || ban.expiresAt > new Date())) {
      throw new AppError('You are banned from this group', 403, 'BANNED');
    }

    const existing = await groupRepository.findMember(groupId, userId);
    if (existing && existing.status === 'active') {
      throw new AppError('Already a member', 409, 'ALREADY_MEMBER');
    }

    if (group.memberCount >= group.maxMembers) {
      throw new AppError('Group is full', 409, 'GROUP_FULL');
    }

    if (existing) {
      await GroupMemberModel.findByIdAndUpdate(existing._id, {
        $set: { status: 'active', leftAt: null },
      }).exec();
    } else {
      await groupRepository.addMember({ groupId, userId, role: MEMBER_ROLES.MEMBER });
    }

    if (!existing) {
      await groupRepository.incrementMemberCount(groupId, 1);
    }
  }

  async leaveGroup(userId: string, groupId: string): Promise<void> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('Not a member', 400, 'NOT_MEMBER');
    }
    if (membership.role === MEMBER_ROLES.OWNER) {
      throw new AppError('Owner cannot leave — transfer ownership first', 400, 'OWNER_CANNOT_LEAVE');
    }
    await groupRepository.removeMember(groupId, userId);
    await groupRepository.incrementMemberCount(groupId, -1);
  }

  async resetInviteLink(userId: string, groupId: string): Promise<string> {
    await this.requirePermission(groupId, userId, 'manage_group');
    const updated = await groupRepository.resetInviteLink(groupId);
    if (!updated) throw new AppError('Group not found', 404, 'NOT_FOUND');
    return updated.inviteLink;
  }

  async joinByInviteLink(userId: string, token: string): Promise<GroupDetail> {
    const group = await groupRepository.findByInviteLink(token);
    if (!group) throw new AppError('Invalid or expired invite link', 404, 'INVALID_INVITE');
    if (group.inviteLinkExpiry && group.inviteLinkExpiry < new Date()) {
      throw new AppError('Invite link has expired', 410, 'INVITE_EXPIRED');
    }

    await this.joinGroup(userId, group._id.toString());
    const membership = await groupRepository.findMember(group._id.toString(), userId);
    return toGroupDetail(group, membership);
  }

  // ——— Messages ———

  async sendMessage(userId: string, dto: SendGroupMessageDto): Promise<GroupMessage> {
    const membership = await groupRepository.findMember(dto.groupId, userId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('Not a member of this group', 403, 'NOT_MEMBER');
    }

    const msg = await groupRepository.createMessage({ ...dto, senderId: userId });
    const profileMap = await fetchProfileMap([userId]);
    return toGroupMessage(msg, profileMap);
  }

  async getMessages(userId: string, query: GroupMessageQuery): Promise<{ messages: GroupMessage[]; hasMore: boolean }> {
    const membership = await groupRepository.findMember(query.groupId, userId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('Not a member', 403, 'NOT_MEMBER');
    }
    const { messages, hasMore } = await groupRepository.findMessages(query);
    // Collect unique sender IDs, then batch-fetch profiles in one query
    const senderIds = [...new Set(messages.map((m) => {
      const raw = m.senderId as unknown;
      return typeof raw === 'object' && raw !== null && '_id' in raw
        ? (raw as { _id: mongoose.Types.ObjectId })._id.toString()
        : String(raw);
    }))];
    const profileMap = await fetchProfileMap(senderIds);
    return { messages: messages.map((m) => toGroupMessage(m, profileMap)), hasMore };
  }

  async editMessage(userId: string, messageId: string, content: string): Promise<GroupMessage> {
    const msg = await groupRepository.findMessageById(messageId);
    if (!msg) throw new AppError('Message not found', 404, 'NOT_FOUND');
    if (msg.senderId.toString() !== userId) throw new AppError('Cannot edit another user\'s message', 403, 'FORBIDDEN');
    const updated = await groupRepository.editMessage(messageId, content);
    if (!updated) throw new AppError('Message not found', 404, 'NOT_FOUND');
    const profileMap = await fetchProfileMap([userId]);
    return toGroupMessage(updated, profileMap);
  }

  async deleteMessage(userId: string, messageId: string): Promise<GroupMessage> {
    const msg = await groupRepository.findMessageById(messageId);
    if (!msg) throw new AppError('Message not found', 404, 'NOT_FOUND');

    const membership = await groupRepository.findMember(msg.groupId.toString(), userId);
    const rawSender = msg.senderId as unknown;
    const senderId = typeof rawSender === 'object' && rawSender !== null && '_id' in rawSender
      ? (rawSender as { _id: mongoose.Types.ObjectId })._id.toString()
      : String(rawSender);
    const isOwner = senderId === userId;
    const canDelete = isOwner || (membership && ([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.MODERATOR] as string[]).includes(membership.role));
    if (!canDelete) throw new AppError('Cannot delete this message', 403, 'FORBIDDEN');

    const deleted = await groupRepository.softDeleteMessage(messageId, userId);
    if (!deleted) throw new AppError('Message not found', 404, 'NOT_FOUND');
    const profileMap = await fetchProfileMap([senderId]);
    return toGroupMessage(deleted, profileMap);
  }

  async reactToMessage(userId: string, messageId: string, emoji: string): Promise<{ action: 'add' | 'remove'; count: number }> {
    const msg = await groupRepository.findMessageById(messageId);
    if (!msg) throw new AppError('Message not found', 404, 'NOT_FOUND');
    const membership = await groupRepository.findMember(msg.groupId.toString(), userId);
    if (!membership || membership.status !== 'active') throw new AppError('Not a member', 403, 'NOT_MEMBER');
    const { action, count } = await groupRepository.toggleReaction(messageId, emoji, userId);
    return { action, count };
  }

  async markRead(userId: string, groupId: string, lastMessageId: string): Promise<void> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'active') return;
    await groupRepository.markRead(groupId, userId, lastMessageId);
  }

  async getPinnedMessages(userId: string, groupId: string): Promise<GroupMessage[]> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'active') throw new AppError('Not a member', 403, 'NOT_MEMBER');
    const msgs = await groupRepository.findPinned(groupId);
    const senderIds = [...new Set(msgs.map((m) => String(m.senderId)))];
    const profileMap = await fetchProfileMap(senderIds);
    return msgs.map((m) => toGroupMessage(m, profileMap));
  }

  async pinMessage(userId: string, messageId: string, pin: boolean): Promise<GroupMessage> {
    const msg = await groupRepository.findMessageById(messageId);
    if (!msg) throw new AppError('Message not found', 404, 'NOT_FOUND');
    await this.requirePermission(msg.groupId.toString(), userId, 'pin_messages');
    const updated = await groupRepository.pinMessage(messageId, pin);
    if (!updated) throw new AppError('Message not found', 404, 'NOT_FOUND');
    const profileMap = await fetchProfileMap([String(msg.senderId)]);
    return toGroupMessage(updated, profileMap);
  }

  // ——— Private helpers ———

  async requirePermission(groupId: string, userId: string, permission: string): Promise<IGroupMember> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'active') {
      throw new AppError('Not a member of this group', 403, 'NOT_MEMBER');
    }

    // Owner and admin always pass
    if (([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(membership.role)) return membership;

    // Moderators can manage members but not group settings
    if (membership.role === MEMBER_ROLES.MODERATOR && ['mute_members', 'kick_members', 'delete_others_messages', 'pin_messages'].includes(permission)) {
      return membership;
    }

    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
}

export const groupService = new GroupService();
