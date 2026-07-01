import mongoose, { Schema, type Document, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'business';
  status: 'active' | 'suspended' | 'deleted' | 'pending_verification';
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  loginAttempts: number;
  lockoutUntil?: Date;
  lastSeen?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  isLocked(): boolean;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_.\-]+$/, 'Username may only contain letters, digits, _, ., and -'],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      // E.164: +[country code][subscriber number], 7-15 digits total after +
      match: [/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'business'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted', 'pending_verification'],
      default: 'pending_verification',
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: {
      type: String,
      select: false, // never returned in queries by default
    },
    loginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    lastSeen: { type: Date },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    // Exclude passwordHash and twoFactorSecret from toJSON/toObject by default
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.twoFactorSecret;
        return ret;
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { sparse: true, unique: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ deletedAt: 1 });

// ---------------------------------------------------------------------------
// Instance methods
// ---------------------------------------------------------------------------

userSchema.methods['comparePassword'] = async function (
  this: IUser,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

/**
 * Returns true when the account is currently locked due to too many failed
 * login attempts. The lock expires automatically after LOCKOUT_DURATION_MS.
 */
userSchema.methods['isLocked'] = function (this: IUser): boolean {
  if (!this.lockoutUntil) return false;
  return this.lockoutUntil > new Date();
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const UserModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);
