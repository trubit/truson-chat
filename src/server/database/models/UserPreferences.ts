import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IUserPreferences extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'everyone' | 'contacts' | 'nobody';
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    onlineStatus: boolean;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    reducedMotion: boolean;
    highContrast: boolean;
  };
  communication: {
    autoDownloadMedia: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const notificationsSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
  },
  { _id: false },
);

const privacyVisibilityValues = ['everyone', 'contacts', 'nobody'] as const;

const privacySchema = new Schema(
  {
    profileVisibility: { type: String, enum: privacyVisibilityValues, default: 'everyone' },
    lastSeenVisibility: { type: String, enum: privacyVisibilityValues, default: 'everyone' },
    readReceipts: { type: Boolean, default: true },
    onlineStatus: { type: Boolean, default: true },
  },
  { _id: false },
);

const accessibilitySchema = new Schema(
  {
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    reducedMotion: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
  },
  { _id: false },
);

const communicationSchema = new Schema(
  {
    autoDownloadMedia: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    vibrationEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    language: { type: String, default: 'en' },
    notifications: { type: notificationsSchema, default: () => ({}) },
    privacy: { type: privacySchema, default: () => ({}) },
    accessibility: { type: accessibilitySchema, default: () => ({}) },
    communication: { type: communicationSchema, default: () => ({}) },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

userPreferencesSchema.index({ userId: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const UserPreferencesModel: Model<IUserPreferences> = mongoose.model<IUserPreferences>(
  'UserPreferences',
  userPreferencesSchema,
);
