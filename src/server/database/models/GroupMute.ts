import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IGroupMute extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  mutedBy: mongoose.Types.ObjectId;
  reason?: string;
  expiresAt?: Date; // null = indefinite
  liftedAt?: Date;
  liftedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const groupMuteSchema = new Schema<IGroupMute>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mutedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    expiresAt: { type: Date },
    liftedAt: { type: Date },
    liftedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

groupMuteSchema.index({ groupId: 1, userId: 1, liftedAt: 1 });
groupMuteSchema.index({ groupId: 1, liftedAt: 1 });
groupMuteSchema.index({ expiresAt: 1 }, { sparse: true });

export const GroupMuteModel: Model<IGroupMute> =
  (mongoose.models['GroupMute'] as Model<IGroupMute>) ??
  mongoose.model<IGroupMute>('GroupMute', groupMuteSchema);
