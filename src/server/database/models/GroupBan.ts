import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IGroupBan extends Document {
  _id: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bannedBy: mongoose.Types.ObjectId;
  reason?: string;
  expiresAt?: Date; // null = permanent
  liftedAt?: Date;
  liftedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const groupBanSchema = new Schema<IGroupBan>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    expiresAt: { type: Date },
    liftedAt: { type: Date },
    liftedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

groupBanSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupBanSchema.index({ groupId: 1, liftedAt: 1 });
groupBanSchema.index({ userId: 1 });
groupBanSchema.index({ expiresAt: 1 }, { sparse: true });

export const GroupBanModel: Model<IGroupBan> =
  (mongoose.models['GroupBan'] as Model<IGroupBan>) ??
  mongoose.model<IGroupBan>('GroupBan', groupBanSchema);
