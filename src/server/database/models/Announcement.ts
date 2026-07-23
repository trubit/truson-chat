import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AnnouncementScope = 'group' | 'community' | 'channel';
export type AnnouncementStatus = 'active' | 'scheduled' | 'expired' | 'deleted';

export interface IAnnouncementAttachment {
  url: string;
  publicId: string;
  mimeType: string;
  name?: string;
  size?: number;
}

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  scope: AnnouncementScope;
  // exactly one of these is set depending on scope
  groupId?: mongoose.Types.ObjectId;
  communityId?: mongoose.Types.ObjectId;
  channelId?: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  attachments: IAnnouncementAttachment[];
  status: AnnouncementStatus;
  isPinned: boolean;
  scheduledAt?: Date; // publish at this time; null = immediate
  expiresAt?: Date;
  publishedAt?: Date;
  deletedAt?: Date;
  readCount: number; // denormalized
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAnnouncementAttachment>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    mimeType: { type: String, required: true },
    name: String,
    size: Number,
  },
  { _id: false },
);

const announcementSchema = new Schema<IAnnouncement>(
  {
    scope: { type: String, enum: ['group', 'community', 'channel'], required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
    channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 20_000 },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'scheduled', 'expired', 'deleted'],
      default: 'active',
    },
    isPinned: { type: Boolean, default: false },
    scheduledAt: { type: Date },
    expiresAt: { type: Date },
    publishedAt: { type: Date },
    deletedAt: { type: Date },
    readCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

announcementSchema.index({ groupId: 1, status: 1, createdAt: -1 }, { sparse: true });
announcementSchema.index({ communityId: 1, status: 1, createdAt: -1 }, { sparse: true });
announcementSchema.index({ channelId: 1, status: 1, createdAt: -1 }, { sparse: true });
announcementSchema.index({ authorId: 1, createdAt: -1 });
announcementSchema.index({ scheduledAt: 1, status: 1 });
announcementSchema.index({ expiresAt: 1, status: 1 });
announcementSchema.index({ isPinned: 1 });
announcementSchema.index({ title: 'text', content: 'text' });

export const AnnouncementModel: Model<IAnnouncement> =
  (mongoose.models['Announcement'] as Model<IAnnouncement>) ??
  mongoose.model<IAnnouncement>('Announcement', announcementSchema);
