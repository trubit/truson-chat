import { randomUUID } from 'crypto';
import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
export type InvitationType  = 'link' | 'direct';

export interface IGroupInvitation extends Document {
  _id:        mongoose.Types.ObjectId;
  groupId:    mongoose.Types.ObjectId;
  createdBy:  mongoose.Types.ObjectId;
  type:       InvitationType;
  token:      string;          // unique URL token
  inviteeId?: mongoose.Types.ObjectId; // for direct invitations
  maxUses:    number;          // 0 = unlimited
  usedCount:  number;
  status:     InvitationStatus;
  expiresAt?: Date;            // null = never
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  createdAt:  Date;
  updatedAt:  Date;
}

const groupInvitationSchema = new Schema<IGroupInvitation>(
  {
    groupId:    { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    type:       { type: String, enum: ['link', 'direct'], default: 'link' },
    token:      { type: String, default: () => randomUUID(), required: true },
    inviteeId:  { type: Schema.Types.ObjectId, ref: 'User' },
    maxUses:    { type: Number, default: 0, min: 0 },
    usedCount:  { type: Number, default: 0, min: 0 },
    status:     { type: String, enum: ['pending', 'accepted', 'declined', 'revoked', 'expired'], default: 'pending' },
    expiresAt:  { type: Date },
    acceptedAt: { type: Date },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

groupInvitationSchema.index({ token: 1 },                    { unique: true });
groupInvitationSchema.index({ groupId: 1, status: 1 });
groupInvitationSchema.index({ groupId: 1, inviteeId: 1 },    { sparse: true });
groupInvitationSchema.index({ createdBy: 1 });
groupInvitationSchema.index({ expiresAt: 1 },                { sparse: true });

export const GroupInvitationModel: Model<IGroupInvitation> =
  mongoose.models['GroupInvitation'] as Model<IGroupInvitation> ??
  mongoose.model<IGroupInvitation>('GroupInvitation', groupInvitationSchema);
