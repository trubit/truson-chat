import fs from 'fs';
import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { cloudinaryService } from '../../../services/cloudinary.js';
import { MediaRepository } from '../repository/index.js';
import { getMediaQueue } from '../../../queues/index.js';
import type { MediaFileType, IMediaFile } from '../../../database/models/MediaFile.js';
import type { UploadedMediaResponse, MediaQuery } from '../types/index.js';
import { logger } from '../../../logger/index.js';

function getMimeMediaType(mimeType: string): MediaFileType {
  if (mimeType.startsWith('image/gif')) return 'gif';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

function toResponse(file: IMediaFile): UploadedMediaResponse {
  return {
    _id: file._id.toString(),
    url: file.secureUrl,
    secureUrl: file.secureUrl,
    publicId: file.publicId,
    mimeType: file.mimeType,
    size: file.size,
    originalName: file.originalName,
    width: file.width,
    height: file.height,
    duration: file.duration,
    thumbnail: file.thumbnail,
    type: file.type,
    status: file.status,
    createdAt: file.createdAt.toISOString(),
  };
}

export class MediaService {
  constructor(private repo: MediaRepository) {}

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    opts: { conversationId?: string; isVoiceNote?: boolean } = {},
  ): Promise<UploadedMediaResponse> {
    const mediaType = opts.isVoiceNote ? 'voice_note' : getMimeMediaType(file.mimetype);

    let cloudResult;
    try {
      cloudResult = await cloudinaryService.upload(file.path, {
        userId,
        mediaType,
        mimeType: file.mimetype,
        originalName: file.originalname,
        tags: ['chat-media'],
      });
    } catch (err) {
      logger.error('Cloudinary upload failed', { err, userId });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError('Failed to upload file. Please try again.', 500, 'UPLOAD_FAILED');
    }

    const createData: Partial<IMediaFile> = {
      uploaderId: new mongoose.Types.ObjectId(userId),
      type: mediaType,
      url: cloudResult.url,
      secureUrl: cloudResult.secureUrl,
      publicId: cloudResult.publicId,
      resourceType: cloudResult.resourceType,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
      width: cloudResult.width,
      height: cloudResult.height,
      duration: cloudResult.duration,
      thumbnail: cloudResult.thumbnailUrl,
      status: 'ready',
    };

    if (opts.conversationId && mongoose.Types.ObjectId.isValid(opts.conversationId)) {
      createData.conversationId = new mongoose.Types.ObjectId(opts.conversationId);
    }

    const mediaFile = await this.repo.create(createData);

    try {
      const queue = getMediaQueue();
      await queue.add('cleanup-local', { type: 'cleanup-local', filePath: file.path });
    } catch {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    return toResponse(mediaFile);
  }

  async uploadMultiple(
    userId: string,
    files: Express.Multer.File[],
    opts: { conversationId?: string } = {},
  ): Promise<UploadedMediaResponse[]> {
    return Promise.all(files.map((f) => this.uploadFile(userId, f, opts)));
  }

  async getMedia(userId: string, mediaId: string): Promise<UploadedMediaResponse> {
    const file = await this.repo.findById(mediaId);
    if (!file || file.deletedAt) throw new AppError('Media not found', 404, 'NOT_FOUND');
    if (file.uploaderId.toString() !== userId)
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    return toResponse(file);
  }

  async getConversationMedia(
    _userId: string,
    query: MediaQuery,
  ): Promise<{ files: UploadedMediaResponse[]; total: number; page: number; totalPages: number }> {
    if (!query.conversationId)
      throw new AppError('conversationId required', 400, 'VALIDATION_ERROR');
    const { files, total } = await this.repo.findByConversation(
      query.conversationId,
      query.type as MediaFileType | undefined,
      query.page ?? 1,
      query.limit ?? 20,
    );
    return {
      files: files.map(toResponse),
      total,
      page: query.page ?? 1,
      totalPages: Math.ceil(total / (query.limit ?? 20)),
    };
  }

  async deleteMedia(userId: string, mediaId: string): Promise<void> {
    const file = await this.repo.findById(mediaId);
    if (!file || file.deletedAt) throw new AppError('Media not found', 404, 'NOT_FOUND');
    if (file.uploaderId.toString() !== userId)
      throw new AppError('Access denied', 403, 'FORBIDDEN');

    const resType = file.resourceType as 'image' | 'video' | 'raw';
    await cloudinaryService.delete(file.publicId, resType);
    await this.repo.softDelete(mediaId);
  }
}

export const mediaService = new MediaService(new MediaRepository());
