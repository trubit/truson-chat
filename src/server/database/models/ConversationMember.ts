import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemberRole = 'owner' | 'admin' | 'member';

export interface IConversationMember extends Document {
  _id:                mongoose.Types.ObjectId;
  conversationId:     mongoose.Types.ObjectId;
  userId:             mongoose.Types.ObjectId;
  role:               MemberRole;
  joinedAt:           Date;
  lastReadMessageId?: mongoose.Types.ObjectId;
  lastReadAt?:        Date;
  unreadCount:        number;
  isMuted:            boolean;
  muteUntil?:         Date;
  isPinned:           boolean;
  isArchived:         boolean;
  notificationsEnabled: boolean;
  leftAt?:            Date;
  createdAt:          Date;
  updatedAt:          Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const conversationMemberSchema = new Schema<IConversationMember>(
  {
    conversationId:     { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    userId:             { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    role:               { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt:           { type: Date, default: Date.now },
    lastReadMessageId:  { type: Schema.Types.ObjectId, ref: 'Message' },
    lastReadAt:         { type: Date },
    unreadCount:        { type: Number, default: 0, min: 0 },
    isMuted:            { type: Boolean, default: false },
    muteUntil:          { type: Date },
    isPinned:           { type: Boolean, default: false },
    isArchived:         { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean, default: true },
    leftAt:             { type: Date },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Primary lookup — member record for a specific user+conversation
conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
// Get all conversations for a user (sidebar list)
conversationMemberSchema.index({ userId: 1, lastActivity: -1 });
// Pinned conversations for a user
conversationMemberSchema.index({ userId: 1, isPinned: 1 });
// Archived conversations for a user
conversationMemberSchema.index({ userId: 1, isArchived: 1 });
// Conversations with unread messages
conversationMemberSchema.index({ userId: 1, unreadCount: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ConversationMemberModel: Model<IConversationMember> =
  mongoose.model<IConversationMember>('ConversationMember', conversationMemberSchema);
