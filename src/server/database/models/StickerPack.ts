import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISticker {
  _id:    mongoose.Types.ObjectId;
  name:   string;
  url:    string;
  publicId: string;
  emoji?: string;
  width:  number;
  height: number;
}

export interface IStickerPack extends Document {
  _id:           mongoose.Types.ObjectId;
  name:          string;
  description?:  string;
  coverUrl:      string;
  coverPublicId: string;
  stickers:      ISticker[];
  isSystem:      boolean;
  isActive:      boolean;
  createdBy?:    mongoose.Types.ObjectId;
  downloadCount: number;
  createdAt:     Date;
  updatedAt:     Date;
}

const stickerSchema = new Schema<ISticker>({
  name:     { type: String, required: true },
  url:      { type: String, required: true },
  publicId: { type: String, required: true },
  emoji:    { type: String },
  width:    { type: Number, required: true, default: 72 },
  height:   { type: Number, required: true, default: 72 },
});

const stickerPackSchema = new Schema<IStickerPack>(
  {
    name:          { type: String, required: true },
    description:   { type: String },
    coverUrl:      { type: String, required: true, default: '' },
    coverPublicId: { type: String, required: true, default: '' },
    stickers:      { type: [stickerSchema], default: [] },
    isSystem:      { type: Boolean, default: false },
    isActive:      { type: Boolean, default: true },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

stickerPackSchema.index({ isSystem: 1, isActive: 1 });
stickerPackSchema.index({ createdBy: 1 });

export const StickerPackModel: Model<IStickerPack> = mongoose.model<IStickerPack>('StickerPack', stickerPackSchema);
