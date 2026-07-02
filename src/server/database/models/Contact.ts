import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IContact extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  contactUserId: mongoose.Types.ObjectId;
  displayName?: string;
  notes?: string;
  category: 'general' | 'work' | 'family' | 'friend' | 'other';
  labels: string[];
  isFavorite: boolean;
  addedVia: 'manual' | 'phone_sync' | 'email_sync' | 'qr_code';
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const contactSchema = new Schema<IContact>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contactUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ['general', 'work', 'family', 'friend', 'other'],
      default: 'general',
    },
    labels: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (arr: string[]) => arr.length <= 10,
          message: 'Cannot have more than 10 labels',
        },
        {
          validator: (arr: string[]) => arr.every((l) => l.length <= 50),
          message: 'Each label must be at most 50 characters',
        },
      ],
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    addedVia: {
      type: String,
      enum: ['manual', 'phone_sync', 'email_sync', 'qr_code'],
      default: 'manual',
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

contactSchema.index({ ownerId: 1, contactUserId: 1 }, { unique: true });
contactSchema.index({ ownerId: 1, isFavorite: 1 });
contactSchema.index({ ownerId: 1, category: 1 });
contactSchema.index({ ownerId: 1, createdAt: -1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ContactModel: Model<IContact> = mongoose.model<IContact>('Contact', contactSchema);
