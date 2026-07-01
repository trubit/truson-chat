import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IDevice extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'other';
  platform: string;
  browser?: string;
  fingerprint?: string;
  trusted: boolean;
  pushToken?: string;
  ipAddress?: string;
  lastSeenAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'other'],
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    browser: { type: String },
    fingerprint: { type: String },
    trusted: { type: Boolean, default: false },
    pushToken: { type: String },
    ipAddress: { type: String },
    lastSeenAt: { type: Date, required: true, default: () => new Date() },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

deviceSchema.index({ userId: 1 });
// Sparse because fingerprint is optional; used to detect duplicate device registrations
deviceSchema.index({ userId: 1, fingerprint: 1 }, { sparse: true });
deviceSchema.index({ userId: 1, trusted: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const DeviceModel: Model<IDevice> = mongoose.model<IDevice>('Device', deviceSchema);
