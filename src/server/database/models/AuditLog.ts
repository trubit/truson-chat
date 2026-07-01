import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** Dot-notation action, e.g. 'user.update', 'session.revoke' */
  action: string;
  /** Resource type, e.g. 'user', 'profile', 'session', 'device' */
  resource: string;
  resourceId?: string;
  changes?: { before: unknown; after: unknown };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    changes: {
      type: new Schema(
        {
          before: { type: Schema.Types.Mixed },
          after: { type: Schema.Types.Mixed },
        },
        { _id: false },
      ),
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    // Audit logs are immutable records — no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1 });
// Global time-descending index for compliance queries
auditLogSchema.index({ createdAt: -1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const AuditLogModel: Model<IAuditLog> = mongoose.model<IAuditLog>(
  'AuditLog',
  auditLogSchema,
);
