import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IPasswordResetToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  /** SHA-256 hash of the raw token — raw token is never stored */
  tokenHash: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  ipAddress?: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: { type: String, required: true, lowercase: true },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    ipAddress: { type: String },
  },
  {
    // Tokens are immutable — no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetTokenSchema.index({ userId: 1, isUsed: 1 });
// TTL index: MongoDB removes expired, unused tokens automatically
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const PasswordResetTokenModel: Model<IPasswordResetToken> =
  mongoose.model<IPasswordResetToken>('PasswordResetToken', passwordResetTokenSchema);
