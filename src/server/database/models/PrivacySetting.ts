import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IPrivacySetting extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileVisibility: 'everyone' | 'contacts' | 'friends' | 'nobody';
  phoneVisibility: 'nobody' | 'contacts' | 'friends';
  emailVisibility: 'nobody' | 'contacts' | 'friends';
  lastSeenVisibility: 'everyone' | 'contacts' | 'friends' | 'nobody';
  onlineStatusVisibility: 'everyone' | 'contacts' | 'friends' | 'nobody';
  friendRequestsFrom: 'everyone' | 'contacts' | 'friends';
  searchVisibility: 'everyone' | 'contacts' | 'friends';
  discoverable: boolean;
  allowContactFromEveryone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const privacySettingSchema = new Schema<IPrivacySetting>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profileVisibility: {
      type: String,
      enum: ['everyone', 'contacts', 'friends', 'nobody'],
      default: 'everyone',
    },
    phoneVisibility: {
      type: String,
      enum: ['nobody', 'contacts', 'friends'],
      default: 'nobody',
    },
    emailVisibility: {
      type: String,
      enum: ['nobody', 'contacts', 'friends'],
      default: 'nobody',
    },
    lastSeenVisibility: {
      type: String,
      enum: ['everyone', 'contacts', 'friends', 'nobody'],
      default: 'everyone',
    },
    onlineStatusVisibility: {
      type: String,
      enum: ['everyone', 'contacts', 'friends', 'nobody'],
      default: 'everyone',
    },
    friendRequestsFrom: {
      type: String,
      enum: ['everyone', 'contacts', 'friends'],
      default: 'everyone',
    },
    searchVisibility: {
      type: String,
      enum: ['everyone', 'contacts', 'friends'],
      default: 'everyone',
    },
    discoverable: {
      type: Boolean,
      default: true,
    },
    allowContactFromEveryone: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes  (userId unique index is created by the field-level `unique: true`)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const PrivacySettingModel: Model<IPrivacySetting> = mongoose.model<IPrivacySetting>(
  'PrivacySetting',
  privacySettingSchema,
);
