import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import type { IMessage } from '../../../database/models/Message.js';
import { MessageRepository } from '../repository/index.js';
import { ConversationRepository } from '../../conversations/repository/index.js';
import type {
  SendMessageDto,
  EditMessageDto,
  ReactDto,
  MessageQuery,
  MessageSearchQuery,
  MessageResponse,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Helper: IMessage → MessageResponse
// ---------------------------------------------------------------------------

function toResponse(msg: IMessage): MessageResponse {
  const isDeleted = !!msg.deletedAt;

  return {
    _id: msg._id.toString(),
    conversationId: msg.conversationId.toString(),
    senderId: msg.senderId.toString(),
    type: msg.type,
    content: isDeleted ? '' : msg.content,
    media: isDeleted ? [] : msg.media,
    replyTo: msg.replyTo ? msg.replyTo.toString() : undefined,
    mentions: msg.mentions.map((m) => m.toString()),
    reactions: msg.reactions.map((r) => ({
      emoji: r.emoji,
      users: r.users.map((u) => u.toString()),
      count: r.count,
    })),
    readBy: msg.readBy.map((rb) => ({
      userId: rb.userId.toString(),
      readAt: rb.readAt.toISOString(),
    })),
    status: msg.status,
    isEdited: isDeleted ? false : msg.isEdited,
    editedAt: !isDeleted && msg.editedAt ? msg.editedAt.toISOString() : undefined,
    deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : undefined,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// MessageService
// ---------------------------------------------------------------------------

export class MessageService {
  constructor(
    private msgRepo: MessageRepository,
    private convRepo: ConversationRepository,
  ) {}

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponse> {
    if (!mongoose.Types.ObjectId.isValid(dto.conversationId)) {
      throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    // Verify conversation exists and user is a member
    const conversation = await this.convRepo.findById(dto.conversationId);
    if (!conversation || conversation.status !== 'active') {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const member = await this.convRepo.getMember(dto.conversationId, userId);
    if (!member || member.leftAt) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    // For direct conversations, check blocks
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(
        (p) => p.toString() !== userId,
      );
      if (otherParticipant) {
        const block = await BlockedUserModel.findOne({
          $or: [
            {
              blockerId: new mongoose.Types.ObjectId(userId),
              blockedId: otherParticipant,
            },
            {
              blockerId: otherParticipant,
              blockedId: new mongoose.Types.ObjectId(userId),
            },
          ],
        })
          .select('_id')
          .lean()
          .exec();

        if (block) {
          throw new AppError(
            'Cannot send message to this user',
            403,
            'BLOCKED',
          );
        }
      }
    }

    // Validate replyTo if provided
    if (dto.replyTo && !mongoose.Types.ObjectId.isValid(dto.replyTo)) {
      throw new AppError('Invalid replyTo message ID', 400, 'INVALID_ID');
    }

    // Create the message
    const message = await this.msgRepo.create({
      conversationId: dto.conversationId,
      senderId: userId,
      type: dto.type,
      content: dto.content,
      replyTo: dto.replyTo,
      mentions: dto.mentions,
    });

    // Update conversation lastMessage snapshot
    await this.convRepo.updateLastMessage(
      dto.conversationId,
      {
        messageId: message._id,
        senderId: message.senderId,
        content: dto.type === 'text' ? dto.content : `[${dto.type}]`,
        type: dto.type,
        sentAt: message.createdAt,
      },
      message.createdAt,
    );

    // Increment unread for other members
    await this.convRepo.incrementUnread(dto.conversationId, userId);

    return toResponse(message);
  }

  async editMessage(
    userId: string,
    messageId: string,
    dto: EditMessageDto,
  ): Promise<MessageResponse> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError('Invalid message ID', 400, 'INVALID_ID');
    }

    const message = await this.msgRepo.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404, 'NOT_FOUND');
    }

    if (message.senderId.toString() !== userId) {
      throw new AppError('You can only edit your own messages', 403, 'FORBIDDEN');
    }

    if (message.deletedAt) {
      throw new AppError('Cannot edit a deleted message', 400, 'MESSAGE_DELETED');
    }

    // Save old content to editHistory before updating
    const oldContent = message.content;
    message.editHistory.push({ content: oldContent, editedAt: new Date() });
    message.content = dto.content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    return toResponse(message);
  }

  async deleteMessage(
    userId: string,
    messageId: string,
  ): Promise<MessageResponse> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError('Invalid message ID', 400, 'INVALID_ID');
    }

    const message = await this.msgRepo.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404, 'NOT_FOUND');
    }

    if (message.senderId.toString() !== userId) {
      throw new AppError(
        'You can only delete your own messages',
        403,
        'FORBIDDEN',
      );
    }

    if (message.deletedAt) {
      throw new AppError('Message already deleted', 400, 'ALREADY_DELETED');
    }

    const deleted = await this.msgRepo.softDelete(messageId, userId);
    if (!deleted) {
      throw new AppError('Failed to delete message', 500, 'DELETE_FAILED');
    }

    return toResponse(deleted);
  }

  async toggleReaction(
    userId: string,
    messageId: string,
    dto: ReactDto,
  ): Promise<{
    action: 'add' | 'remove';
    emoji: string;
    reactions: MessageResponse['reactions'];
  }> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError('Invalid message ID', 400, 'INVALID_ID');
    }

    const { message, action } = await this.msgRepo.toggleReaction(
      messageId,
      dto.emoji,
      userId,
    );

    return {
      action,
      emoji: dto.emoji,
      reactions: message.reactions.map((r) => ({
        emoji: r.emoji,
        users: r.users.map((u) => u.toString()),
        count: r.count,
      })),
    };
  }

  async getMessages(
    userId: string,
    conversationId: string,
    query: MessageQuery,
  ): Promise<{ messages: MessageResponse[]; hasMore: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
    }

    // Must be a member
    const member = await this.convRepo.getMember(conversationId, userId);
    if (!member || member.leftAt) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }

    const limit = query.limit ?? 30;
    const { messages, hasMore } = await this.msgRepo.findByConversation(
      conversationId,
      { limit, before: query.before, after: query.after },
    );

    return {
      messages: messages.map(toResponse),
      hasMore,
    };
  }

  async getMessage(userId: string, messageId: string): Promise<MessageResponse> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError('Invalid message ID', 400, 'INVALID_ID');
    }

    const message = await this.msgRepo.findById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404, 'NOT_FOUND');
    }

    // Must be a member of the conversation
    const member = await this.convRepo.getMember(
      message.conversationId.toString(),
      userId,
    );
    if (!member || member.leftAt) {
      throw new AppError('Message not found', 404, 'NOT_FOUND');
    }

    return toResponse(message);
  }

  async markDelivered(userId: string, conversationId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
    }
    await this.msgRepo.markAllDelivered(conversationId, userId);
  }

  async markRead(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
    }
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new AppError('Invalid message ID', 400, 'INVALID_ID');
    }

    // Add read receipt to message and all earlier messages
    await this.msgRepo.markAllRead(conversationId, userId, messageId);

    // Reset unread count for this user in the conversation
    await this.convRepo.resetUnread(conversationId, userId);

    // Update member lastReadMessageId
    await this.convRepo.updateMember(conversationId, userId, {
      lastReadMessageId: new mongoose.Types.ObjectId(messageId),
      lastReadAt: new Date(),
      unreadCount: 0,
    });
  }

  async searchMessages(
    userId: string,
    query: MessageSearchQuery,
  ): Promise<{ messages: MessageResponse[]; total: number }> {
    // If conversationId is provided, check membership
    if (query.conversationId) {
      if (!mongoose.Types.ObjectId.isValid(query.conversationId)) {
        throw new AppError('Invalid conversation ID', 400, 'INVALID_ID');
      }
      const member = await this.convRepo.getMember(
        query.conversationId,
        userId,
      );
      if (!member || member.leftAt) {
        throw new AppError('Conversation not found', 404, 'NOT_FOUND');
      }
    }

    const { messages, total } = await this.msgRepo.search(query);

    return {
      messages: messages.map(toResponse),
      total,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const messageService = new MessageService(
  new MessageRepository(),
  new ConversationRepository(),
);
