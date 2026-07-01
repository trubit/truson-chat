import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  displayName: string;
  bio?: string;
  avatar?: { url: string; publicId: string };
  coverImage?: { url: string; publicId: string };
  location?: string;
  website?: string;
  statusMessage?: string;
  privacySettings: {
    profileVisibility: 'everyone' | 'contacts' | 'nobody';
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
    aboutVisibility: 'everyone' | 'contacts' | 'nobody';
  };
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const mediaAssetSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const privacyVisibilityValues = ['everyone', 'contacts', 'nobody'] as const;

const privacySettingsSchema = new Schema(
  {
    profileVisibility: {
      type: String,
      enum: privacyVisibilityValues,
      default: 'everyone',
    },
    lastSeenVisibility: {
      type: String,
      enum: privacyVisibilityValues,
      default: 'everyone',
    },
    profilePhotoVisibility: {
      type: String,
      enum: privacyVisibilityValues,
      default: 'everyone',
    },
    aboutVisibility: {
      type: String,
      enum: privacyVisibilityValues,
      default: 'everyone',
    },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    bio: { type: String, maxlength: 500 },
    avatar: { type: mediaAssetSchema },
    coverImage: { type: mediaAssetSchema },
    location: { type: String, maxlength: 100 },
    website: { type: String, maxlength: 200 },
    statusMessage: { type: String, maxlength: 100 },
    privacySettings: {
      type: privacySettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

profileSchema.index({ userId: 1 }, { unique: true });
// Text index for profile search across display name and bio
profileSchema.index({ displayName: 'text', bio: 'text' });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ProfileModel: Model<IProfile> = mongoose.model<IProfile>('Profile', profileSchema);
