import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupMemberRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';
export type GroupMemberStatus = 'active' | 'suspended';

export interface IGroupMember extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: GroupMemberRole;
  customTitle?: string; // e.g. "Lead Developer"
  status: GroupMemberStatus;
  customRoles: mongoose.Types.ObjectId[]; // GroupRole refs
  addedBy?: mongoose.Types.ObjectId; // who invited / approved
  joinedAt: Date;
  leftAt?: Date;
  mutedUntil?: Date; // quick per-member mute (not GroupMute model)
  lastReadAt?: Date;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const groupMemberSchema = new Schema<IGroupMember>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member', 'guest'],
      default: 'member',
    },
    customTitle: { type: String, trim: true, maxlength: 64 },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    customRoles: [{ type: Schema.Types.ObjectId, ref: 'GroupRole' }],
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    mutedUntil: { type: Date },
    lastReadAt: { type: Date },
    messageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Primary membership lookup
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
// List members of a group (active, sorted by role priority)
groupMemberSchema.index({ groupId: 1, status: 1, role: 1 });
// Find all groups a user belongs to
groupMemberSchema.index({ userId: 1, leftAt: 1 });
// Admins / moderators for permission checks
groupMemberSchema.index({ groupId: 1, role: 1, leftAt: 1 });
// Last-read for unread count
groupMemberSchema.index({ groupId: 1, userId: 1, lastReadAt: -1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const GroupMemberModel: Model<IGroupMember> =
  (mongoose.models['GroupMember'] as Model<IGroupMember>) ??
  mongoose.model<IGroupMember>('GroupMember', groupMemberSchema);
