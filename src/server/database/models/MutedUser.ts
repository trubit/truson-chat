import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IMutedUser extends Document {
  _id: mongoose.Types.ObjectId;
  muterId: mongoose.Types.ObjectId;
  mutedId: mongoose.Types.ObjectId;
  mutedNotifications: boolean;
  mutedMessages: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const mutedUserSchema = new Schema<IMutedUser>(
  {
    muterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mutedId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mutedNotifications: {
      type: Boolean,
      default: true,
    },
    mutedMessages: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

mutedUserSchema.index({ muterId: 1, mutedId: 1 }, { unique: true });
mutedUserSchema.index({ muterId: 1 });
mutedUserSchema.index({ muterId: 1, expiresAt: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const MutedUserModel: Model<IMutedUser> = mongoose.model<IMutedUser>(
  'MutedUser',
  mutedUserSchema,
);
