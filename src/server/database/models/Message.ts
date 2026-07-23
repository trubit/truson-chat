import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MsgType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'sticker'
  | 'gif'
  | 'location'
  | 'contact'
  | 'voice_note'
  | 'system'
  | 'call_ended';

export type MsgStatus = 'sent' | 'delivered' | 'read' | 'deleted';

export interface IMessageReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[];
  count: number;
}

export interface IReadReceipt {
  userId: mongoose.Types.ObjectId;
  readAt: Date;
}

export interface IDeliveryReceipt {
  userId: mongoose.Types.ObjectId;
  deliveredAt: Date;
}

export interface IMessageMedia {
  url: string;
  publicId?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  name?: string;
  waveform?: number[];
}

export interface IEditEntry {
  content: string;
  editedAt: Date;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  type: MsgType;
  content: string;
  media: IMessageMedia[];
  replyTo?: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  reactions: IMessageReaction[];
  readBy: IReadReceipt[];
  deliveredTo: IDeliveryReceipt[];
  status: MsgStatus;
  isEdited: boolean;
  editedAt?: Date;
  editHistory: IEditEntry[];
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const reactionSchema = new Schema<IMessageReaction>(
  {
    emoji: { type: String, required: true, maxlength: 10 },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const readReceiptSchema = new Schema<IReadReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, required: true },
  },
  { _id: false },
);

const deliveryReceiptSchema = new Schema<IDeliveryReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deliveredAt: { type: Date, required: true },
  },
  { _id: false },
);

const mediaSchema = new Schema<IMessageMedia>(
  {
    url: { type: String, required: true },
    publicId: String,
    mimeType: String,
    size: Number,
    width: Number,
    height: Number,
    duration: Number,
    thumbnail: String,
    name: String,
    waveform: [{ type: Number }],
  },
  { _id: false },
);

const editEntrySchema = new Schema<IEditEntry>(
  {
    content: { type: String, required: true },
    editedAt: { type: Date, required: true },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'text',
        'image',
        'video',
        'audio',
        'file',
        'sticker',
        'gif',
        'location',
        'contact',
        'voice_note',
        'system',
        'call_ended',
      ],
      default: 'text',
    },
    content: { type: String, default: '', maxlength: 10_000 },
    media: { type: [mediaSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: { type: [reactionSchema], default: [] },
    readBy: { type: [readReceiptSchema], default: [] },
    deliveredTo: { type: [deliveryReceiptSchema], default: [] },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'deleted'], default: 'sent' },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editHistory: { type: [editEntrySchema], default: [] },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Primary message list query (newest last = ascending for display; -1 for fetching latest)
messageSchema.index({ conversationId: 1, createdAt: -1 });
// Cursor-based pagination
messageSchema.index({ conversationId: 1, _id: -1 });
// Find messages by sender
messageSchema.index({ senderId: 1, createdAt: -1 });
// Reply chain lookups
messageSchema.index({ replyTo: 1 });
// Status filters (undelivered messages)
messageSchema.index({ conversationId: 1, status: 1 });
// Read receipts: who in a conversation has read up to a point
messageSchema.index({ conversationId: 1, 'readBy.userId': 1 });
// Full-text search on message content
messageSchema.index({ content: 'text' });
// Soft-delete filter
messageSchema.index({ deletedAt: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const MessageModel: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
