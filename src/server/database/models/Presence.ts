import mongoose, { Schema, type Document, type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IPresence extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  customStatus?: string;
  statusMessage?: string;
  statusExpiresAt?: Date;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const presenceSchema = new Schema<IPresence>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away', 'busy', 'invisible'],
      default: 'offline',
    },
    customStatus: {
      type: String,
      maxlength: 100,
    },
    statusMessage: {
      type: String,
      maxlength: 200,
    },
    statusExpiresAt: {
      type: Date,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Indexes  (userId unique index is created by the field-level `unique: true`)
// ---------------------------------------------------------------------------

presenceSchema.index({ status: 1 });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const PresenceModel: Model<IPresence> = mongoose.model<IPresence>(
  'Presence',
  presenceSchema,
);
