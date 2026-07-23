import mongoose, { Schema, type Document, type Model } from 'mongoose';

// Tracks per-user access to private channels and per-channel settings.
// Public channels don't require a member record to read; private ones do.

export interface IChannelMember extends Document {
  _id: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  addedBy?: mongoose.Types.ObjectId;
  mutedUntil?: Date; // null/past = not muted
  lastReadAt?: Date;
  lastMessageId?: mongoose.Types.ObjectId; // last message seen in this channel
  createdAt: Date;
  updatedAt: Date;
}

const channelMemberSchema = new Schema<IChannelMember>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    mutedUntil: { type: Date },
    lastReadAt: { type: Date },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'GroupMessage' },
  },
  { timestamps: true },
);

channelMemberSchema.index({ channelId: 1, userId: 1 }, { unique: true });
channelMemberSchema.index({ userId: 1, channelId: 1 });

export const ChannelMemberModel: Model<IChannelMember> =
  (mongoose.models['ChannelMember'] as Model<IChannelMember>) ??
  mongoose.model<IChannelMember>('ChannelMember', channelMemberSchema);
