import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Permission flags (bitfield-style set stored as string array for clarity)
// ---------------------------------------------------------------------------

export type GroupPermission =
  | 'send_messages'
  | 'send_media'
  | 'send_voice'
  | 'send_stickers'
  | 'send_gifs'
  | 'share_links'
  | 'pin_messages'
  | 'delete_messages'
  | 'ban_members'
  | 'mute_members'
  | 'invite_members'
  | 'manage_members'
  | 'manage_roles'
  | 'edit_group_info'
  | 'view_audit_log'
  | 'manage_invitations'
  | 'approve_join_requests'
  | 'create_announcements'
  | 'manage_announcements';

export const ALL_GROUP_PERMISSIONS: GroupPermission[] = [
  'send_messages',
  'send_media',
  'send_voice',
  'send_stickers',
  'send_gifs',
  'share_links',
  'pin_messages',
  'delete_messages',
  'ban_members',
  'mute_members',
  'invite_members',
  'manage_members',
  'manage_roles',
  'edit_group_info',
  'view_audit_log',
  'manage_invitations',
  'approve_join_requests',
  'create_announcements',
  'manage_announcements',
];

export const DEFAULT_MEMBER_PERMISSIONS: GroupPermission[] = [
  'send_messages',
  'send_media',
  'send_voice',
  'send_stickers',
  'send_gifs',
  'share_links',
  'invite_members',
];

export interface IGroupRole extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  name: string;
  color?: string; // hex color for role badge
  permissions: GroupPermission[];
  isDefault: boolean; // default role assigned to new members
  position: number; // display order / hierarchy (higher = more power)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const groupRoleSchema = new Schema<IGroupRole>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    name: { type: String, required: true, trim: true, maxlength: 64 },
    color: { type: String, match: /^#[0-9A-Fa-f]{6}$/ },
    permissions: [{ type: String, enum: ALL_GROUP_PERMISSIONS }],
    isDefault: { type: Boolean, default: false },
    position: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

groupRoleSchema.index({ groupId: 1, name: 1 }, { unique: true });
groupRoleSchema.index({ groupId: 1, position: -1 });
groupRoleSchema.index({ groupId: 1, isDefault: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const GroupRoleModel: Model<IGroupRole> =
  (mongoose.models['GroupRole'] as Model<IGroupRole>) ??
  mongoose.model<IGroupRole>('GroupRole', groupRoleSchema);
