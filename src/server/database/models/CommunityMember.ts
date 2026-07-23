import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type CommunityMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface ICommunityMember extends Document {
  _id: mongoose.Types.ObjectId;
  communityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: CommunityMemberRole;
  addedBy?: mongoose.Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const communityMemberSchema = new Schema<ICommunityMember>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { timestamps: true },
);

communityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
communityMemberSchema.index({ communityId: 1, role: 1, leftAt: 1 });
communityMemberSchema.index({ userId: 1, leftAt: 1 });

export const CommunityMemberModel: Model<ICommunityMember> =
  (mongoose.models['CommunityMember'] as Model<ICommunityMember>) ??
  mongoose.model<ICommunityMember>('CommunityMember', communityMemberSchema);
