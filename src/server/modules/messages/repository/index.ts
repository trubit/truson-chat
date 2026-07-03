import mongoose from 'mongoose';
import {
  MessageModel,
  type IMessage,
  type MsgType,
} from '../../../database/models/Message.js';
import type { MessageSearchQuery } from '../types/index.js';

// ---------------------------------------------------------------------------
// MessageRepository
// ---------------------------------------------------------------------------

export class MessageRepository {
  async create(data: {
    conversationId: string;
    senderId: string;
    type: MsgType;
    content: string;
    replyTo?: string;
    mentions?: string[];
    media?: import('../../../database/models/Message.js').IMessageMedia[];
  }): Promise<IMessage> {
    const doc = await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(data.conversationId),
      senderId: new mongoose.Types.ObjectId(data.senderId),
      type: data.type,
      content: data.content,
      replyTo: data.replyTo
        ? new mongoose.Types.ObjectId(data.replyTo)
        : undefined,
      mentions: (data.mentions ?? []).map(
        (id) => new mongoose.Types.ObjectId(id),
      ),
      media: data.media ?? [],
      status: 'sent',
    });
    return doc;
  }

  async findById(id: string): Promise<IMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return MessageModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }

  // Cursor-based pagination: newest first within a conversation
  async findByConversation(
    conversationId: string,
    options: { limit: number; before?: string; after?: string },
  ): Promise<{ messages: IMessage[]; hasMore: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { messages: [], hasMore: false };
    }

    const { limit, before, after } = options;
    const fetchLimit = limit + 1;
    const convOid = new mongoose.Types.ObjectId(conversationId);

    let query: Record<string, unknown> = { conversationId: convOid };
    let sortDir: 1 | -1 = -1;

    if (before && mongoose.Types.ObjectId.isValid(before)) {
      query = {
        conversationId: convOid,
        _id: { $lt: new mongoose.Types.ObjectId(before) },
      };
      sortDir = -1;
    } else if (after && mongoose.Types.ObjectId.isValid(after)) {
      query = {
        conversationId: convOid,
        _id: { $gt: new mongoose.Types.ObjectId(after) },
      };
      sortDir = 1;
    }

    const docs = await MessageModel.find(query)
      .sort({ _id: sortDir })
      .limit(fetchLimit)
      .exec();

    const hasMore = docs.length > limit;
    const messages = hasMore ? docs.slice(0, limit) : docs;

    // Always return in ascending order (oldest first)
    if (sortDir === -1) {
      messages.reverse();
    }

    return { messages, hasMore };
  }

  async update(id: string, data: { content: string }): Promise<IMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return MessageModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set: { content: data.content, isEdited: true, editedAt: new Date() } },
      { returnDocument: 'after' },
    ).exec();
  }

  async softDelete(id: string, deletedBy: string): Promise<IMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return MessageModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: new mongoose.Types.ObjectId(deletedBy),
          status: 'deleted',
          content: '',
          media: [],
        },
      },
      { returnDocument: 'after' },
    ).exec();
  }

  // Toggle reaction — add or remove
  async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string,
  ): Promise<{ message: IMessage; action: 'add' | 'remove' }> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new Error('Invalid message ID');
    }

    const userOid = new mongoose.Types.ObjectId(userId);
    const msgOid = new mongoose.Types.ObjectId(messageId);

    const message = await MessageModel.findById(msgOid).exec();
    if (!message) throw new Error('Message not found');

    const reactionIdx = message.reactions.findIndex((r) => r.emoji === emoji);

    if (reactionIdx === -1) {
      // Emoji doesn't exist — add new reaction entry
      message.reactions.push({ emoji, users: [userOid], count: 1 });
      await message.save();
      return { message, action: 'add' };
    }

    const reaction = message.reactions[reactionIdx];
    const userIdx = reaction.users.findIndex((u) => u.equals(userOid));

    if (userIdx !== -1) {
      // User already reacted — remove their reaction
      reaction.users.splice(userIdx, 1);
      reaction.count = Math.max(0, reaction.count - 1);

      if (reaction.count === 0) {
        // Remove the entire reaction entry
        message.reactions.splice(reactionIdx, 1);
      }
      await message.save();
      return { message, action: 'remove' };
    } else {
      // Emoji exists but user hasn't reacted — add user
      reaction.users.push(userOid);
      reaction.count += 1;
      await message.save();
      return { message, action: 'add' };
    }
  }

  async addDeliveryReceipt(messageId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) return;
    const userOid = new mongoose.Types.ObjectId(userId);
    await MessageModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(messageId),
      {
        $addToSet: {
          deliveredTo: { userId: userOid, deliveredAt: new Date() },
        },
      },
    ).exec();
  }

  async addReadReceipt(messageId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) return;
    const userOid = new mongoose.Types.ObjectId(userId);
    // Only add if not already present
    await MessageModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(messageId),
        'readBy.userId': { $ne: userOid },
      },
      {
        $push: { readBy: { userId: userOid, readAt: new Date() } },
        $set: { status: 'read' },
      },
    ).exec();
  }

  // Mark all unread messages in a conversation as delivered for a user
  async markAllDelivered(
    conversationId: string,
    userId: string,
  ): Promise<string[]> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return [];

    const userOid = new mongoose.Types.ObjectId(userId);
    const convOid = new mongoose.Types.ObjectId(conversationId);

    // Find messages not yet delivered to this user
    const messages = await MessageModel.find({
      conversationId: convOid,
      senderId: { $ne: userOid },
      'deliveredTo.userId': { $ne: userOid },
      status: { $in: ['sent'] },
      deletedAt: null,
    })
      .select('_id')
      .lean()
      .exec();

    if (messages.length === 0) return [];

    const ids = messages.map((m) => m._id);

    await MessageModel.updateMany(
      { _id: { $in: ids } },
      {
        $push: {
          deliveredTo: { userId: userOid, deliveredAt: new Date() },
        },
        $set: { status: 'delivered' },
      },
    ).exec();

    return ids.map((id) => id.toString());
  }

  // Mark all messages up to messageId as read by userId
  async markAllRead(
    conversationId: string,
    userId: string,
    upToMessageId: string,
  ): Promise<void> {
    if (
      !mongoose.Types.ObjectId.isValid(conversationId) ||
      !mongoose.Types.ObjectId.isValid(upToMessageId)
    ) {
      return;
    }

    const userOid = new mongoose.Types.ObjectId(userId);
    const convOid = new mongoose.Types.ObjectId(conversationId);
    const upToOid = new mongoose.Types.ObjectId(upToMessageId);

    // Update all messages up to and including upToMessageId that don't have a read receipt from this user
    await MessageModel.updateMany(
      {
        conversationId: convOid,
        _id: { $lte: upToOid },
        senderId: { $ne: userOid },
        'readBy.userId': { $ne: userOid },
        deletedAt: null,
      },
      {
        $push: { readBy: { userId: userOid, readAt: new Date() } },
        $set: { status: 'read' },
      },
    ).exec();
  }

  // Count unread messages for a user in a conversation (after their lastReadMessageId)
  async countUnread(
    conversationId: string,
    userId: string,
    afterMessageId?: string,
  ): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return 0;

    const userOid = new mongoose.Types.ObjectId(userId);
    const convOid = new mongoose.Types.ObjectId(conversationId);

    const filter: Record<string, unknown> = {
      conversationId: convOid,
      senderId: { $ne: userOid },
      'readBy.userId': { $ne: userOid },
      deletedAt: null,
    };

    if (afterMessageId && mongoose.Types.ObjectId.isValid(afterMessageId)) {
      filter['_id'] = { $gt: new mongoose.Types.ObjectId(afterMessageId) };
    }

    return MessageModel.countDocuments(filter).exec();
  }

  async search(
    query: MessageSearchQuery,
  ): Promise<{ messages: IMessage[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      $text: { $search: query.q },
      deletedAt: null,
    };

    if (
      query.conversationId &&
      mongoose.Types.ObjectId.isValid(query.conversationId)
    ) {
      filter['conversationId'] = new mongoose.Types.ObjectId(
        query.conversationId,
      );
    }

    const [messages, total] = await Promise.all([
      MessageModel.find(filter)
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      MessageModel.countDocuments(filter).exec(),
    ]);

    return { messages, total };
  }
}
