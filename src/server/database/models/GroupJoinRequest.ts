import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IGroupJoinRequest extends Document {
  _id:          mongoose.Types.ObjectId;
  groupId:      mongoose.Types.ObjectId;
  userId:       mongoose.Types.ObjectId;
  message?:     string;   // optional message from requester
  status:       JoinRequestStatus;
  reviewedBy?:  mongoose.Types.ObjectId;
  reviewedAt?:  Date;
  rejectReason?: string;
  createdAt:    Date;
  updatedAt:    Date;
}

const groupJoinRequestSchema = new Schema<IGroupJoinRequest>(
  {
    groupId:      { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    userId:       { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    message:      { type: String, trim: true, maxlength: 300 },
    status:       { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:   { type: Date },
    rejectReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

groupJoinRequestSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupJoinRequestSchema.index({ groupId: 1, status: 1 });
groupJoinRequestSchema.index({ userId: 1, status: 1 });
groupJoinRequestSchema.index({ createdAt: -1 });

export const GroupJoinRequestModel: Model<IGroupJoinRequest> =
  mongoose.models['GroupJoinRequest'] as Model<IGroupJoinRequest> ??
  mongoose.model<IGroupJoinRequest>('GroupJoinRequest', groupJoinRequestSchema);
