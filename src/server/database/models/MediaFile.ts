import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type MediaFileType = 'image' | 'video' | 'audio' | 'voice_note' | 'document' | 'gif' | 'sticker';
export type MediaFileStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';

export interface IMediaFile extends Document {
  _id:             mongoose.Types.ObjectId;
  uploaderId:      mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  messageId?:      mongoose.Types.ObjectId;
  type:            MediaFileType;
  url:             string;
  secureUrl:       string;
  publicId:        string;
  resourceType:    string;
  mimeType:        string;
  size:            number;
  originalName:    string;
  width?:          number;
  height?:         number;
  duration?:       number;
  thumbnail?:      string;
  waveform?:       number[];
  status:          MediaFileStatus;
  checksum?:       string;
  metadata:        Record<string, unknown>;
  deletedAt?:      Date;
  createdAt:       Date;
  updatedAt:       Date;
}

const mediaFileSchema = new Schema<IMediaFile>(
  {
    uploaderId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    messageId:      { type: Schema.Types.ObjectId, ref: 'Message' },
    type:           { type: String, enum: ['image','video','audio','voice_note','document','gif','sticker'], required: true },
    url:            { type: String, required: true },
    secureUrl:      { type: String, required: true },
    publicId:       { type: String, required: true },
    resourceType:   { type: String, default: 'image' },
    mimeType:       { type: String, required: true },
    size:           { type: Number, required: true },
    originalName:   { type: String, default: '' },
    width:          { type: Number },
    height:         { type: Number },
    duration:       { type: Number },
    thumbnail:      { type: String },
    waveform:       [{ type: Number }],
    status:         { type: String, enum: ['uploading','processing','ready','failed','deleted'], default: 'ready' },
    checksum:       { type: String },
    metadata:       { type: Schema.Types.Mixed, default: {} },
    deletedAt:      { type: Date },
  },
  { timestamps: true },
);

mediaFileSchema.index({ uploaderId: 1, createdAt: -1 });
mediaFileSchema.index({ conversationId: 1, type: 1, createdAt: -1 });
mediaFileSchema.index({ messageId: 1 });
mediaFileSchema.index({ publicId: 1 }, { unique: true });
mediaFileSchema.index({ status: 1 });
mediaFileSchema.index({ deletedAt: 1 });

export const MediaFileModel: Model<IMediaFile> = mongoose.model<IMediaFile>('MediaFile', mediaFileSchema);
