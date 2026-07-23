import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types (mirrors Message model with group-specific additions)
// ---------------------------------------------------------------------------

export type GroupMsgType =
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
  | 'announcement'
  | 'pinned';

export type GroupMsgStatus = 'sent' | 'deleted';

export interface IGroupMessageMedia {
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

export interface IGroupMessageReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[];
  count: number;
}

export interface IGroupMention {
  userId: mongoose.Types.ObjectId;
  offset: number;
  length: number;
}

export interface IGroupMessage extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  channelId?: mongoose.Types.ObjectId; // set when message is in a channel inside a group
  senderId: mongoose.Types.ObjectId;
  type: GroupMsgType;
  content: string;
  media: IGroupMessageMedia[];
  replyTo?: mongoose.Types.ObjectId;
  mentions: IGroupMention[];
  reactions: IGroupMessageReaction[];
  status: GroupMsgStatus;
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  readCount: number; // denormalized for quick display; exact reads in GroupMessageRead
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const mediaSchema = new Schema<IGroupMessageMedia>(
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

const reactionSchema = new Schema<IGroupMessageReaction>(
  {
    emoji: { type: String, required: true, maxlength: 10 },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    count: { type: Number, default: 0 },
  },
  { _id: false },
);

const mentionSchema = new Schema<IGroupMention>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    offset: { type: Number, required: true },
    length: { type: Number, required: true },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const groupMessageSchema = new Schema<IGroupMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
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
        'announcement',
        'pinned',
      ],
      default: 'text',
    },
    content: { type: String, default: '', maxlength: 10_000 },
    media: { type: [mediaSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: 'GroupMessage' },
    mentions: { type: [mentionSchema], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    status: { type: String, enum: ['sent', 'deleted'], default: 'sent' },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    readCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ groupId: 1, _id: -1 });
groupMessageSchema.index({ groupId: 1, isPinned: 1 });
groupMessageSchema.index({ senderId: 1, createdAt: -1 });
groupMessageSchema.index({ replyTo: 1 });
groupMessageSchema.index({ 'mentions.userId': 1, groupId: 1 });
groupMessageSchema.index({ content: 'text' });
groupMessageSchema.index({ deletedAt: 1 });
// Channel messages
groupMessageSchema.index({ channelId: 1, createdAt: -1 }, { sparse: true });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const GroupMessageModel: Model<IGroupMessage> =
  (mongoose.models['GroupMessage'] as Model<IGroupMessage>) ??
  mongoose.model<IGroupMessage>('GroupMessage', groupMessageSchema);
