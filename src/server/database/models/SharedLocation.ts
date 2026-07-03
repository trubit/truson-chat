import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISharedLocation extends Document {
  _id:            mongoose.Types.ObjectId;
  sharedBy:       mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  messageId?:     mongoose.Types.ObjectId;
  latitude:       number;
  longitude:      number;
  accuracy?:      number;
  altitude?:      number;
  name?:          string;
  address?:       string;
  isLive:         boolean;
  expiresAt?:     Date;
  createdAt:      Date;
  updatedAt:      Date;
}

const sharedLocationSchema = new Schema<ISharedLocation>(
  {
    sharedBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    messageId:      { type: Schema.Types.ObjectId, ref: 'Message' },
    latitude:       { type: Number, required: true, min: -90, max: 90 },
    longitude:      { type: Number, required: true, min: -180, max: 180 },
    accuracy:       { type: Number },
    altitude:       { type: Number },
    name:           { type: String, maxlength: 200 },
    address:        { type: String, maxlength: 500 },
    isLive:         { type: Boolean, default: false },
    expiresAt:      { type: Date },
  },
  { timestamps: true },
);

sharedLocationSchema.index({ sharedBy: 1 });
sharedLocationSchema.index({ conversationId: 1 });
sharedLocationSchema.index({ messageId: 1 });
sharedLocationSchema.index({ expiresAt: 1 });

export const SharedLocationModel: Model<ISharedLocation> = mongoose.model<ISharedLocation>('SharedLocation', sharedLocationSchema);
