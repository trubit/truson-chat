import fs from 'fs';
import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { cloudinaryService } from '../../../services/cloudinary.js';
import { MediaFileModel } from '../../../database/models/MediaFile.js';
import { getMediaQueue } from '../../../queues/index.js';
import { logger } from '../../../logger/index.js';
import type { VoiceNoteResponse } from '../types/index.js';

export class VoiceNoteService {
  async uploadVoiceNote(
    userId: string,
    file: Express.Multer.File,
    opts: { conversationId?: string } = {},
  ): Promise<VoiceNoteResponse> {
    let cloudResult;
    try {
      cloudResult = await cloudinaryService.upload(file.path, {
        userId,
        mediaType: 'voice_note',
        mimeType: file.mimetype,
        originalName: file.originalname,
        tags: ['voice-note'],
      });
    } catch (err) {
      logger.error('Cloudinary voice note upload failed', { err, userId });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new AppError('Failed to upload voice note. Please try again.', 500, 'UPLOAD_FAILED');
    }

    const createData: Record<string, unknown> = {
      uploaderId: new mongoose.Types.ObjectId(userId),
      type: 'voice_note',
      url: cloudResult.url,
      secureUrl: cloudResult.secureUrl,
      publicId: cloudResult.publicId,
      resourceType: cloudResult.resourceType,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
      duration: cloudResult.duration,
      waveform: [],
      status: 'ready',
    };

    if (opts.conversationId && mongoose.Types.ObjectId.isValid(opts.conversationId)) {
      createData['conversationId'] = new mongoose.Types.ObjectId(opts.conversationId);
    }

    const mediaFile = await MediaFileModel.create(createData);

    try {
      const queue = getMediaQueue();
      await queue.add('cleanup-local', { type: 'cleanup-local', filePath: file.path });
    } catch {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    return {
      _id: mediaFile._id.toString(),
      url: mediaFile.secureUrl,
      secureUrl: mediaFile.secureUrl,
      publicId: mediaFile.publicId,
      mimeType: mediaFile.mimeType,
      size: mediaFile.size,
      duration: mediaFile.duration,
      waveform: mediaFile.waveform ?? [],
      status: mediaFile.status,
      createdAt: mediaFile.createdAt.toISOString(),
    };
  }

  async getVoiceNote(userId: string, id: string): Promise<VoiceNoteResponse> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid ID', 400, 'VALIDATION_ERROR');
    }
    const file = await MediaFileModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      type: 'voice_note',
      deletedAt: { $exists: false },
    }).exec();

    if (!file) throw new AppError('Voice note not found', 404, 'NOT_FOUND');
    if (file.uploaderId.toString() !== userId)
      throw new AppError('Access denied', 403, 'FORBIDDEN');

    return {
      _id: file._id.toString(),
      url: file.secureUrl,
      secureUrl: file.secureUrl,
      publicId: file.publicId,
      mimeType: file.mimeType,
      size: file.size,
      duration: file.duration,
      waveform: file.waveform ?? [],
      status: file.status,
      createdAt: file.createdAt.toISOString(),
    };
  }
}

export const voiceNoteService = new VoiceNoteService();
