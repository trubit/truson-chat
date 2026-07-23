import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IVerificationToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  type: 'email_verification' | 'phone_otp';
  /** SHA-256 hash of the raw token — raw token is never stored */
  tokenHash: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const verificationTokenSchema = new Schema<IVerificationToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: { type: String, required: true, lowercase: true },
    type: {
      type: String,
      enum: ['email_verification', 'phone_otp'],
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
  },
  {
    // Tokens are immutable — no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

verificationTokenSchema.index({ tokenHash: 1 }, { unique: true });
verificationTokenSchema.index({ userId: 1, type: 1, isUsed: 1 });
// TTL index: MongoDB removes expired, unused tokens automatically
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const VerificationTokenModel: Model<IVerificationToken> = mongoose.model<IVerificationToken>(
  'VerificationToken',
  verificationTokenSchema,
);
