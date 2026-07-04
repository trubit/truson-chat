import { randomUUID } from 'crypto';
import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupType   = 'public' | 'private' | 'restricted';
export type GroupStatus = 'active' | 'archived' | 'deleted';

export type InvitePermission   = 'everyone' | 'admins' | 'owner';
export type MessagePermission  = 'everyone' | 'admins' | 'owner';

export interface IGroupAvatar {
  url:      string;
  publicId: string;
}

export interface IGroupSettings {
  joinApprovalRequired:    boolean;
  messagingRestricted:     MessagePermission;
  invitePermission:        InvitePermission;
  mediaPermission:         MessagePermission;
  disappearingMessages:    boolean;
  disappearingMessagesTtl: number; // seconds; 0 = off
  slowMode:                boolean;
  slowModeInterval:        number; // seconds between messages per user
  pinMessagePermission:    InvitePermission;
  editGroupInfoPermission: InvitePermission;
}

export interface IGroup extends Document {
  _id:              mongoose.Types.ObjectId;
  name:             string;
  handle?:          string; // @handle, unique, for mention / deep-link
  description?:     string;
  type:             GroupType;
  status:           GroupStatus;
  avatar?:          IGroupAvatar;
  coverImage?:      IGroupAvatar;
  createdBy:        mongoose.Types.ObjectId;
  communityId?:     mongoose.Types.ObjectId;
  memberCount:      number;
  maxMembers:       number;
  settings:         IGroupSettings;
  categories:       string[];
  tags:             string[];
  inviteLink:       string;  // always set, regenerate to revoke
  inviteLinkExpiry?: Date;
  pinnedMessageIds: mongoose.Types.ObjectId[];
  lastMessageAt?:   Date;
  archivedAt?:      Date;
  deletedAt?:       Date;
  createdAt:        Date;
  updatedAt:        Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const avatarSchema = new Schema<IGroupAvatar>(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false },
);

const settingsSchema = new Schema<IGroupSettings>(
  {
    joinApprovalRequired:    { type: Boolean, default: false },
    messagingRestricted:     { type: String, enum: ['everyone', 'admins', 'owner'], default: 'everyone' },
    invitePermission:        { type: String, enum: ['everyone', 'admins', 'owner'], default: 'everyone' },
    mediaPermission:         { type: String, enum: ['everyone', 'admins', 'owner'], default: 'everyone' },
    disappearingMessages:    { type: Boolean, default: false },
    disappearingMessagesTtl: { type: Number, default: 0, min: 0 },
    slowMode:                { type: Boolean, default: false },
    slowModeInterval:        { type: Number, default: 30, min: 1 },
    pinMessagePermission:    { type: String, enum: ['everyone', 'admins', 'owner'], default: 'admins' },
    editGroupInfoPermission: { type: String, enum: ['everyone', 'admins', 'owner'], default: 'admins' },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const groupSchema = new Schema<IGroup>(
  {
    name:             { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    handle:           { type: String, trim: true, lowercase: true, maxlength: 32 },
    description:      { type: String, trim: true, maxlength: 500 },
    type:             { type: String, enum: ['public', 'private', 'restricted'], default: 'private' },
    status:           { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
    avatar:           { type: avatarSchema },
    coverImage:       { type: avatarSchema },
    createdBy:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    communityId:      { type: Schema.Types.ObjectId, ref: 'Community' },
    memberCount:      { type: Number, default: 1, min: 0 },
    maxMembers:       { type: Number, default: 1024, min: 2, max: 200_000 },
    settings:         { type: settingsSchema, default: () => ({}) },
    categories:       [{ type: String, trim: true, maxlength: 50 }],
    tags:             [{ type: String, trim: true, maxlength: 50 }],
    inviteLink:       { type: String, default: () => randomUUID(), required: true },
    inviteLinkExpiry: { type: Date },
    pinnedMessageIds: [{ type: Schema.Types.ObjectId, ref: 'GroupMessage' }],
    lastMessageAt:    { type: Date },
    archivedAt:       { type: Date },
    deletedAt:        { type: Date },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

groupSchema.index({ handle: 1 },                   { unique: true, sparse: true });
groupSchema.index({ communityId: 1, status: 1 });
groupSchema.index({ type: 1, status: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ inviteLink: 1 },               { unique: true });
groupSchema.index({ status: 1, lastMessageAt: -1 });
groupSchema.index({ categories: 1, status: 1 });
groupSchema.index({ tags: 1 });
groupSchema.index({ name: 'text', description: 'text', tags: 'text' });
groupSchema.index({ deletedAt: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const GroupModel: Model<IGroup> =
  mongoose.models['Group'] as Model<IGroup> ??
  mongoose.model<IGroup>('Group', groupSchema);
