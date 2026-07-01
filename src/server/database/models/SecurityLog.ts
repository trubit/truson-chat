import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verified'
  | 'phone_verified'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'account_locked'
  | 'account_unlocked'
  | 'session_revoked'
  | 'device_added'
  | 'device_removed'
  | 'profile_updated'
  | 'suspicious_activity'
  | 'token_refreshed';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ISecurityLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  eventType: SecurityEventType;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: mongoose.Types.ObjectId;
  location?: { country?: string; city?: string };
  metadata?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SECURITY_EVENT_TYPES: SecurityEventType[] = [
  'login_success',
  'login_failed',
  'logout',
  'password_changed',
  'password_reset_requested',
  'password_reset_completed',
  'email_verified',
  'phone_verified',
  '2fa_enabled',
  '2fa_disabled',
  'account_locked',
  'account_unlocked',
  'session_revoked',
  'device_added',
  'device_removed',
  'profile_updated',
  'suspicious_activity',
  'token_refreshed',
];

const securityLogSchema = new Schema<ISecurityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventType: {
      type: String,
      enum: SECURITY_EVENT_TYPES,
      required: true,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    location: {
      type: new Schema(
        {
          country: { type: String },
          city: { type: String },
        },
        { _id: false },
      ),
    },
    // Stored as Mixed so arbitrary key/value pairs can be recorded per event
    metadata: { type: Schema.Types.Mixed },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
  },
  {
    // Security logs are immutable audit records — no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

securityLogSchema.index({ userId: 1, createdAt: -1 });
securityLogSchema.index({ userId: 1, eventType: 1 });
securityLogSchema.index({ severity: 1 });
// Global time-descending index for ops dashboards and alerting
securityLogSchema.index({ createdAt: -1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const SecurityLogModel: Model<ISecurityLog> = mongoose.model<ISecurityLog>(
  'SecurityLog',
  securityLogSchema,
);
