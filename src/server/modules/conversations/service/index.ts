import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import { UserModel, ProfileModel } from '../../../database/models/index.js';
import type { IConversation } from '../../../database/models/Conversation.js';
import type { IConversationMember } from '../../../database/models/ConversationMember.js';
import { ConversationRepository } from '../repository/index.js';
import type {
  ConversationListQuery,
  ConversationResponse,
  MemberProfile,
  MuteConversationDto,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toResponse(
  conv: IConversation,
  member: IConversationMember,
  memberProfiles: MemberProfile[] = [],
): ConversationResponse {
  return {
    _id: conv._id.toString(),
    type: conv.type,
    participants: conv.participants.map((p) => p.toString()),
    createdBy: conv.createdBy.toString(),
    lastMessage: conv.lastMessage
      ? {
          messageId: conv.lastMessage.messageId.toString(),
          senderId: conv.lastMessage.senderId.toString(),
          content: conv.lastMessage.content,
          type: conv.lastMessage.type,
          sentAt: conv.lastMessage.sentAt.toISOString(),
        }
      : undefined,
    lastActivity: conv.lastActivity.toISOString(),
    metadata: {
      name: conv.metadata?.name,
      description: conv.metadata?.description,
      avatar: conv.metadata?.avatar
        ? {
            url: conv.metadata.avatar.url,
            publicId: conv.metadata.avatar.publicId,
          }
        : undefined,
      isReadOnly: conv.metadata?.isReadOnly ?? false,
    },
    status: conv.status,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    // membership fields
    unreadCount: member.unreadCount,
    isPinned: member.isPinned,
    isArchived: member.isArchived,
    isMuted: member.isMuted,
    muteUntil: member.muteUntil?.toISOString(),
    myRole: member.role,
    memberProfiles,
  };
}

async function fetchMemberProfiles(participantIds: string[]): Promise<MemberProfile[]> {
  if (participantIds.length === 0) return [];
  const objectIds = participantIds.map((id) => new mongoose.Types.ObjectId(id));

  // Get usernames from User model
  const users = await UserModel.find(
    { _id: { $in: objectIds } },
    { _id: 1, username: 1 },
  ).lean().exec();

  // Get display names + avatars from Profile model
  const profiles = await ProfileModel.find(
    { userId: { $in: objectIds } },
    { userId: 1, displayName: 1, 'avatar.url': 1 },
  ).lean().exec();

  const usernameMap = new Map(users.map((u) => [u._id.toString(), u.username]));
  const profileMap = new Map(
    profiles.map((p) => [p.userId.toString(), p]),
  );

  return participantIds.map((id) => {
    const username = usernameMap.get(id) ?? 'unknown';
    const profile = profileMap.get(id);
    return {
      userId: id,
      displayName: profile?.displayName ?? username,
      username,
      avatar: profile?.avatar?.url,
    };
  });
}

// ---------------------------------------------------------------------------
// ConversationService
// ---------------------------------------------------------------------------

export class ConversationService {
  constructor(private repo: ConversationRepository) {}

  // Get or create a direct conversation — idempotent
  async getOrCreateDirect(
    userId: string,
    participantId: string,
  ): Promise<ConversationResponse> {
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      throw new AppError('Invalid participant ID', 400, 'INVALID_ID');
    }

    if (userId === participantId) {
      throw new AppError(
        'Cannot start a conversation with yourself',
        400,
        'CANNOT_SELF_CONVERSE',
      );
    }

    // Check blocks in either direction
    const block = await BlockedUserModel.findOne({
      $or: [
        {
          blockerId: new mongoose.Types.ObjectId(userId),
          blockedId: new mongoose.Types.ObjectId(participantId),
        },
        {
          blockerId: new mongoose.Types.ObjectId(participantId),
          blockedId: new mongoose.Types.ObjectId(userId),
        },
      ],
    })
      .select('_id')
      .lean()
      .exec();

    if (block) {
      throw new AppError(
        'Cannot start conversation with this user',
        403,
        'BLOCKED',
      );
    }

    // Try to find existing conversation
    let conversation = await this.repo.findDirect(userId, participantId);

    if (!conversation) {
      conversation = await this.repo.createDirect(userId, participantId);
    }

    const member = await this.repo.getMember(
      conversation._id.toString(),
      userId,
    );

    if (!member) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const profiles = await fetchMemberProfiles(
      conversation.participants.map((p) => p.toString()),
    );
    return toResponse(conversation, member, profiles);
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationResponse> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    const conversation = await this.repo.findById(conversationId);
    if (!conversation || conversation.status !== 'active') {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const member = await this.repo.getMember(conversationId, userId);
    if (!member || member.leftAt) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const profiles = await fetchMemberProfiles(
      conversation.participants.map((p) => p.toString()),
    );
    return toResponse(conversation, member, profiles);
  }

  async getConversations(
    userId: string,
    query: ConversationListQuery,
  ): Promise<{
    conversations: ConversationResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { conversations, total } = await this.repo.findForUser(userId, {
      ...query,
      page,
      limit,
    });

    // Batch-fetch all unique participant profiles
    const allParticipantIds = [
      ...new Set(conversations.flatMap(({ conv }) => conv.participants.map((p) => p.toString()))),
    ];
    const profiles = await fetchMemberProfiles(allParticipantIds);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const responses = conversations.map(({ conv, member }) => {
      const convProfiles = conv.participants
        .map((p) => profileMap.get(p.toString()))
        .filter((p): p is MemberProfile => p !== undefined);
      return toResponse(conv, member, convProfiles);
    });

    return {
      conversations: responses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async archiveConversation(userId: string, conversationId: string): Promise<void> {
    await this._requireMember(userId, conversationId);
    await this.repo.updateMember(conversationId, userId, { isArchived: true });
  }

  async unarchiveConversation(userId: string, conversationId: string): Promise<void> {
    await this._requireMember(userId, conversationId);
    await this.repo.updateMember(conversationId, userId, { isArchived: false });
  }

  async pinConversation(userId: string, conversationId: string): Promise<void> {
    await this._requireMember(userId, conversationId);
    await this.repo.updateMember(conversationId, userId, { isPinned: true });
  }

  async unpinConversation(userId: string, conversationId: string): Promise<void> {
    await this._requireMember(userId, conversationId);
    await this.repo.updateMember(conversationId, userId, { isPinned: false });
  }

  async muteConversation(
    userId: string,
    conversationId: string,
    dto: MuteConversationDto,
  ): Promise<void> {
    await this._requireMember(userId, conversationId);

    const muteUntil =
      dto.duration !== undefined
        ? new Date(Date.now() + dto.duration * 60 * 1000)
        : undefined;

    await this.repo.updateMember(conversationId, userId, {
      isMuted: true,
      muteUntil,
    });
  }

  async unmuteConversation(userId: string, conversationId: string): Promise<void> {
    await this._requireMember(userId, conversationId);
    await this.repo.updateMember(conversationId, userId, {
      isMuted: false,
      muteUntil: undefined,
    });
  }

  async markRead(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await this._requireMember(userId, conversationId);

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError('Invalid message ID', 400, 'INVALID_ID');
    }

    await this.repo.updateMember(conversationId, userId, {
      lastReadMessageId: new mongoose.Types.ObjectId(messageId),
      lastReadAt: new Date(),
      unreadCount: 0,
    });
  }

  async getMembers(
    userId: string,
    conversationId: string,
  ): Promise<IConversationMember[]> {
    await this._requireMember(userId, conversationId);
    return this.repo.getMembers(conversationId);
  }

  // Ensure user is an active member; throws NOT_FOUND if not
  private async _requireMember(
    userId: string,
    conversationId: string,
  ): Promise<IConversationMember> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const conversation = await this.repo.findById(conversationId);
    if (!conversation || conversation.status !== 'active') {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const member = await this.repo.getMember(conversationId, userId);
    if (!member || member.leftAt) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    return member;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const conversationService = new ConversationService(
  new ConversationRepository(),
);
