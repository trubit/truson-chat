import mongoose, { Schema, type Document, type Model } from 'mongoose';

// Pivot table — which groups belong to which community.

export interface ICommunityGroup extends Document {
  _id:         mongoose.Types.ObjectId;
  communityId: mongoose.Types.ObjectId;
  groupId:     mongoose.Types.ObjectId;
  addedBy:     mongoose.Types.ObjectId;
  position:    number; // display order within community
  createdAt:   Date;
  updatedAt:   Date;
}

const communityGroupSchema = new Schema<ICommunityGroup>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    groupId:     { type: Schema.Types.ObjectId, ref: 'Group',     required: true },
    addedBy:     { type: Schema.Types.ObjectId, ref: 'User',      required: true },
    position:    { type: Number, default: 0 },
  },
  { timestamps: true },
);

communityGroupSchema.index({ communityId: 1, groupId: 1 }, { unique: true });
communityGroupSchema.index({ communityId: 1, position: 1 });
communityGroupSchema.index({ groupId: 1 });

export const CommunityGroupModel: Model<ICommunityGroup> =
  mongoose.models['CommunityGroup'] as Model<ICommunityGroup> ??
  mongoose.model<ICommunityGroup>('CommunityGroup', communityGroupSchema);
