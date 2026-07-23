import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type CommunityType = 'public' | 'private';
export type CommunityStatus = 'active' | 'archived' | 'deleted';

export interface ICommunityAvatar {
  url: string;
  publicId: string;
}

export interface ICommunitySettings {
  joinApprovalRequired: boolean;
  invitePermission: 'everyone' | 'admins';
  discoverability: 'public' | 'link_only' | 'invite_only';
}

export interface ICommunity extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  handle?: string;
  description?: string;
  rules?: string;
  type: CommunityType;
  status: CommunityStatus;
  avatar?: ICommunityAvatar;
  coverImage?: ICommunityAvatar;
  createdBy: mongoose.Types.ObjectId;
  memberCount: number;
  groupCount: number;
  settings: ICommunitySettings;
  categories: string[];
  tags: string[];
  archivedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const avatarSchema = new Schema<ICommunityAvatar>(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false },
);

const settingsSchema = new Schema<ICommunitySettings>(
  {
    joinApprovalRequired: { type: Boolean, default: false },
    invitePermission: { type: String, enum: ['everyone', 'admins'], default: 'admins' },
    discoverability: {
      type: String,
      enum: ['public', 'link_only', 'invite_only'],
      default: 'public',
    },
  },
  { _id: false },
);

const communitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    handle: { type: String, trim: true, lowercase: true, maxlength: 32 },
    description: { type: String, trim: true, maxlength: 1000 },
    rules: { type: String, trim: true, maxlength: 5000 },
    type: { type: String, enum: ['public', 'private'], default: 'public' },
    status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
    avatar: { type: avatarSchema },
    coverImage: { type: avatarSchema },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberCount: { type: Number, default: 0, min: 0 },
    groupCount: { type: Number, default: 0, min: 0 },
    settings: { type: settingsSchema, default: () => ({}) },
    categories: [{ type: String, trim: true, maxlength: 50 }],
    tags: [{ type: String, trim: true, maxlength: 50 }],
    archivedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

communitySchema.index({ handle: 1 }, { unique: true, sparse: true });
communitySchema.index({ type: 1, status: 1 });
communitySchema.index({ createdBy: 1 });
communitySchema.index({ categories: 1, status: 1 });
communitySchema.index({ tags: 1 });
communitySchema.index({ name: 'text', description: 'text', tags: 'text' });
communitySchema.index({ deletedAt: 1 });

export const CommunityModel: Model<ICommunity> =
  (mongoose.models['Community'] as Model<ICommunity>) ??
  mongoose.model<ICommunity>('Community', communitySchema);
