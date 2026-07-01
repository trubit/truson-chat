import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deviceId?: mongoose.Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  location?: { country?: string; city?: string };
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
    },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    location: {
      type: new Schema(
        {
          country: { type: String },
          city: { type: String },
        },
        { _id: false },
      ),
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true, default: () => new Date() },
    revokedAt: { type: Date },
    revokedReason: { type: String },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

sessionSchema.index({ userId: 1, isActive: 1 });
// TTL index: MongoDB removes the document when expiresAt is reached
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ isActive: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const SessionModel: Model<ISession> = mongoose.model<ISession>('Session', sessionSchema);
