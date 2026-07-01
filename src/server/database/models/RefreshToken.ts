import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IRefreshToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: mongoose.Types.ObjectId;
  /** SHA-256 hash of the raw token — raw token is never stored */
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  /** Points to the replacement token when this token is rotated */
  replacedBy?: mongoose.Types.ObjectId;
  ipAddress?: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshToken' },
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

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ sessionId: 1 });
// TTL index: MongoDB automatically removes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const RefreshTokenModel: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  refreshTokenSchema,
);
