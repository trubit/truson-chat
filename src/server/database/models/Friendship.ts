import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IFriendship extends Document {
  _id: mongoose.Types.ObjectId;
  user1Id: mongoose.Types.ObjectId;
  user2Id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const friendshipSchema = new Schema<IFriendship>(
  {
    user1Id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2Id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

friendshipSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });
friendshipSchema.index({ user1Id: 1 });
friendshipSchema.index({ user2Id: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const FriendshipModel: Model<IFriendship> = mongoose.model<IFriendship>(
  'Friendship',
  friendshipSchema,
);
