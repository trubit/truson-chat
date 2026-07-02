import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IBlockedUser extends Document {
  _id: mongoose.Types.ObjectId;
  blockerId: mongoose.Types.ObjectId;
  blockedId: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const blockedUserSchema = new Schema<IBlockedUser>(
  {
    blockerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      maxlength: 200,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

blockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
blockedUserSchema.index({ blockerId: 1 });
blockedUserSchema.index({ blockedId: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const BlockedUserModel: Model<IBlockedUser> = mongoose.model<IBlockedUser>(
  'BlockedUser',
  blockedUserSchema,
);
