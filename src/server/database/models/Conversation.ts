import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConversationType   = 'direct' | 'group';
export type ConversationStatus = 'active'  | 'deleted';

export interface IConversationLastMessage {
  messageId: mongoose.Types.ObjectId;
  senderId:  mongoose.Types.ObjectId;
  content:   string;
  type:      string;
  sentAt:    Date;
}

export interface IConversationMetadata {
  name?:        string;
  description?: string;
  avatar?:      { url: string; publicId: string };
  isReadOnly:   boolean;
}

export interface IConversation extends Document {
  _id:          mongoose.Types.ObjectId;
  type:         ConversationType;
  participants: mongoose.Types.ObjectId[];
  createdBy:    mongoose.Types.ObjectId;
  lastMessage?: IConversationLastMessage;
  lastActivity: Date;
  metadata:     IConversationMetadata;
  status:       ConversationStatus;
  deletedAt?:   Date;
  createdAt:    Date;
  updatedAt:    Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const lastMessageSchema = new Schema<IConversationLastMessage>(
  {
    messageId: { type: Schema.Types.ObjectId, required: true },
    senderId:  { type: Schema.Types.ObjectId, required: true },
    content:   { type: String, default: '' },
    type:      { type: String, default: 'text' },
    sentAt:    { type: Date, required: true },
  },
  { _id: false },
);

const metadataSchema = new Schema<IConversationMetadata>(
  {
    name:        { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 300 },
    avatar: {
      url:       { type: String },
      publicId:  { type: String },
    },
    isReadOnly: { type: Boolean, default: false },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const conversationSchema = new Schema<IConversation>(
  {
    type:         { type: String, enum: ['direct', 'group'], required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage:  { type: lastMessageSchema },
    lastActivity: { type: Date, default: Date.now },
    metadata:     { type: metadataSchema, default: () => ({ isReadOnly: false }) },
    status:       { type: String, enum: ['active', 'deleted'], default: 'active' },
    deletedAt:    { type: Date },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Find conversations by participant (most-used query)
conversationSchema.index({ participants: 1 });
// Sort conversation list by recency
conversationSchema.index({ participants: 1, lastActivity: -1 });
// Find existing direct conversation between two users
conversationSchema.index({ type: 1, participants: 1 });
// Filter active/deleted conversations
conversationSchema.index({ status: 1, lastActivity: -1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ConversationModel: Model<IConversation> =
  mongoose.model<IConversation>('Conversation', conversationSchema);
