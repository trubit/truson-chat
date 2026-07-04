import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Tracks per-user, per-group last-read position for efficient unread counts.
// One document per (groupId, userId) — upserted on read.
// ---------------------------------------------------------------------------

export interface IGroupMessageRead extends Document {
  _id:           mongoose.Types.ObjectId;
  groupId:       mongoose.Types.ObjectId;
  userId:        mongoose.Types.ObjectId;
  lastMessageId: mongoose.Types.ObjectId;  // last message seen
  lastReadAt:    Date;
  createdAt:     Date;
  updatedAt:     Date;
}

const groupMessageReadSchema = new Schema<IGroupMessageRead>(
  {
    groupId:       { type: Schema.Types.ObjectId, ref: 'Group',        required: true },
    userId:        { type: Schema.Types.ObjectId, ref: 'User',         required: true },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'GroupMessage', required: true },
    lastReadAt:    { type: Date, default: Date.now },
  },
  { timestamps: true },
);

groupMessageReadSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMessageReadSchema.index({ userId: 1 });

export const GroupMessageReadModel: Model<IGroupMessageRead> =
  mongoose.models['GroupMessageRead'] as Model<IGroupMessageRead> ??
  mongoose.model<IGroupMessageRead>('GroupMessageRead', groupMessageReadSchema);
