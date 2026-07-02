import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IContactSyncLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  source: 'phone' | 'email' | 'csv';
  totalProcessed: number;
  matched: number;
  imported: number;
  failed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  syncErrors: string[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const contactSyncLogSchema = new Schema<IContactSyncLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['phone', 'email', 'csv'],
      default: 'phone',
    },
    totalProcessed: {
      type: Number,
      default: 0,
    },
    matched: {
      type: Number,
      default: 0,
    },
    imported: {
      type: Number,
      default: 0,
    },
    failed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    syncErrors: {
      type: [String],
      default: [],
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

contactSyncLogSchema.index({ userId: 1, createdAt: -1 });
contactSyncLogSchema.index({ userId: 1, status: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ContactSyncLogModel: Model<IContactSyncLog> = mongoose.model<IContactSyncLog>(
  'ContactSyncLog',
  contactSyncLogSchema,
);
