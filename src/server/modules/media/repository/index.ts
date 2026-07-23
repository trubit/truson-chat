import mongoose from 'mongoose';
import {
  MediaFileModel,
  type IMediaFile,
  type MediaFileType,
} from '../../../database/models/MediaFile.js';

export class MediaRepository {
  async create(data: Partial<IMediaFile>): Promise<IMediaFile> {
    return MediaFileModel.create(data);
  }

  async findById(id: string): Promise<IMediaFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return MediaFileModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }

  async findByConversation(
    conversationId: string,
    type?: MediaFileType,
    page = 1,
    limit = 20,
  ): Promise<{ files: IMediaFile[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return { files: [], total: 0 };

    const filter: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      deletedAt: { $exists: false },
    };
    if (type) filter['type'] = type;

    const [files, total] = await Promise.all([
      MediaFileModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      MediaFileModel.countDocuments(filter).exec(),
    ]);

    return { files, total };
  }

  async update(id: string, data: Partial<IMediaFile>): Promise<IMediaFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return MediaFileModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), data, {
      new: true,
    }).exec();
  }

  async softDelete(id: string): Promise<IMediaFile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return MediaFileModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { deletedAt: new Date(), status: 'deleted' },
      { new: true },
    ).exec();
  }

  async findByPublicId(publicId: string): Promise<IMediaFile | null> {
    return MediaFileModel.findOne({ publicId }).exec();
  }
}

export const mediaRepository = new MediaRepository();
