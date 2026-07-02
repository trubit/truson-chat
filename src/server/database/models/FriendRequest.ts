import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IFriendRequest extends Document {
  _id: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  message?: string;
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
      default: 'pending',
    },
    message: {
      type: String,
      maxlength: 200,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    respondedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

friendRequestSchema.index({ senderId: 1, recipientId: 1 }, { unique: true });
friendRequestSchema.index({ recipientId: 1, status: 1 });
friendRequestSchema.index({ senderId: 1, status: 1 });
friendRequestSchema.index({ status: 1, expiresAt: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const FriendRequestModel: Model<IFriendRequest> = mongoose.model<IFriendRequest>(
  'FriendRequest',
  friendRequestSchema,
);
