import mongoose from 'mongoose';
import {
  ConversationModel,
  type IConversation,
  type IConversationLastMessage,
} from '../../../database/models/Conversation.js';
import {
  ConversationMemberModel,
  type IConversationMember,
} from '../../../database/models/ConversationMember.js';
import type { ConversationListQuery } from '../types/index.js';

// ---------------------------------------------------------------------------
// ConversationRepository
// ---------------------------------------------------------------------------

export class ConversationRepository {
  // Find existing direct conversation between two users
  async findDirect(userId1: string, userId2: string): Promise<IConversation | null> {
    return ConversationModel.findOne({
      type: 'direct',
      participants: {
        $all: [new mongoose.Types.ObjectId(userId1), new mongoose.Types.ObjectId(userId2)],
        $size: 2,
      },
      status: 'active',
    }).exec();
  }

  // Find conversation by ID
  async findById(id: string): Promise<IConversation | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return ConversationModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }

  // Create a new direct conversation + member records
  async createDirect(userId1: string, userId2: string): Promise<IConversation> {
    const conversation = await ConversationModel.create({
      type: 'direct',
      participants: [new mongoose.Types.ObjectId(userId1), new mongoose.Types.ObjectId(userId2)],
      createdBy: new mongoose.Types.ObjectId(userId1),
      lastActivity: new Date(),
      metadata: { isReadOnly: false },
      status: 'active',
    });

    // Create member records for both participants
    await ConversationMemberModel.create([
      {
        conversationId: conversation._id,
        userId: new mongoose.Types.ObjectId(userId1),
        role: 'owner',
        joinedAt: new Date(),
      },
      {
        conversationId: conversation._id,
        userId: new mongoose.Types.ObjectId(userId2),
        role: 'member',
        joinedAt: new Date(),
      },
    ]);

    return conversation;
  }

  // Update conversation metadata
  async update(id: string, data: Partial<IConversation>): Promise<IConversation | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return ConversationModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set: data },
      { returnDocument: 'after' },
    ).exec();
  }

  // Update lastMessage snapshot (called after each new message)
  async updateLastMessage(
    id: string,
    lastMsg: IConversationLastMessage,
    lastActivity: Date,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await ConversationModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), {
      $set: { lastMessage: lastMsg, lastActivity },
    }).exec();
  }

  // Soft delete
  async delete(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await ConversationModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), {
      $set: { status: 'deleted', deletedAt: new Date() },
    }).exec();
  }

  // Get a member record
  async getMember(conversationId: string, userId: string): Promise<IConversationMember | null> {
    if (
      !mongoose.Types.ObjectId.isValid(conversationId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return null;
    }
    return ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();
  }

  // Update a member record
  async updateMember(
    conversationId: string,
    userId: string,
    data: Partial<IConversationMember>,
  ): Promise<IConversationMember | null> {
    if (
      !mongoose.Types.ObjectId.isValid(conversationId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return null;
    }
    return ConversationMemberModel.findOneAndUpdate(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: data },
      { returnDocument: 'after' },
    ).exec();
  }

  // Get all members of a conversation
  async getMembers(conversationId: string): Promise<IConversationMember[]> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return [];
    return ConversationMemberModel.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      leftAt: null,
    }).exec();
  }

  // Get paginated conversation list for a user
  async findForUser(
    userId: string,
    query: ConversationListQuery,
  ): Promise<{
    conversations: { conv: IConversation; member: IConversationMember }[];
    total: number;
  }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { conversations: [], total: 0 };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const archived = query.archived ?? false;

    const memberFilter = {
      userId: new mongoose.Types.ObjectId(userId),
      leftAt: null,
      isArchived: archived,
    };

    const [members, total] = await Promise.all([
      ConversationMemberModel.find(memberFilter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ConversationMemberModel.countDocuments(memberFilter).exec(),
    ]);

    if (members.length === 0) {
      return { conversations: [], total };
    }

    const conversationIds = members.map((m) => m.conversationId);
    const convDocs = await ConversationModel.find({
      _id: { $in: conversationIds },
      status: 'active',
    })
      .sort({ lastActivity: -1 })
      .exec();

    const convMap = new Map(convDocs.map((c) => [c._id.toString(), c]));

    const results: { conv: IConversation; member: IConversationMember }[] = [];
    for (const member of members) {
      const conv = convMap.get(member.conversationId.toString());
      if (conv) {
        results.push({ conv, member });
      }
    }

    results.sort(
      (a, b) => new Date(b.conv.lastActivity).getTime() - new Date(a.conv.lastActivity).getTime(),
    );

    return { conversations: results, total };
  }

  // Increment unread for all members except excludeUserId
  async incrementUnread(conversationId: string, excludeUserId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return;
    await ConversationMemberModel.updateMany(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        userId: { $ne: new mongoose.Types.ObjectId(excludeUserId) },
        leftAt: null,
      },
      { $inc: { unreadCount: 1 } },
    ).exec();
  }

  // Reset unread count
  async resetUnread(conversationId: string, userId: string): Promise<void> {
    if (
      !mongoose.Types.ObjectId.isValid(conversationId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return;
    }
    await ConversationMemberModel.findOneAndUpdate(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: { unreadCount: 0 } },
    ).exec();
  }
}
