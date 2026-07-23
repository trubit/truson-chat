import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type ChannelType = 'text' | 'announcement' | 'voice' | 'stage';
export type ChannelStatus = 'active' | 'archived' | 'deleted';

export interface IChannelPermissionOverride {
  roleId: mongoose.Types.ObjectId;
  allow: string[]; // permission names granted
  deny: string[]; // permission names denied
}

export interface IChannel extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId; // parent group / community
  name: string;
  description?: string;
  type: ChannelType;
  status: ChannelStatus;
  position: number; // display order within group
  isPrivate: boolean;
  slowModeSeconds: number; // 0 = disabled
  topic?: string;
  permissionOverrides: IChannelPermissionOverride[];
  lastMessageAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  archivedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const permissionOverrideSchema = new Schema<IChannelPermissionOverride>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'GroupRole', required: true },
    allow: [{ type: String }],
    deny: [{ type: String }],
  },
  { _id: false },
);

const channelSchema = new Schema<IChannel>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    type: { type: String, enum: ['text', 'announcement', 'voice', 'stage'], default: 'text' },
    status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
    position: { type: Number, default: 0 },
    isPrivate: { type: Boolean, default: false },
    slowModeSeconds: { type: Number, default: 0, min: 0, max: 21_600 },
    topic: { type: String, trim: true, maxlength: 1024 },
    permissionOverrides: { type: [permissionOverrideSchema], default: [] },
    lastMessageAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    archivedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

channelSchema.index({ groupId: 1, position: 1 });
channelSchema.index({ groupId: 1, status: 1 });
channelSchema.index(
  { groupId: 1, name: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'deleted' } } },
);
channelSchema.index({ deletedAt: 1 });

export const ChannelModel: Model<IChannel> =
  (mongoose.models['Channel'] as Model<IChannel>) ??
  mongoose.model<IChannel>('Channel', channelSchema);
