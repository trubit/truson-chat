import { Worker, type Job } from 'bullmq';
import { getEnv } from '../config/env.js';
import { cloudinaryService } from '../services/cloudinary.js';
import { MediaFileModel } from '../database/models/MediaFile.js';
import { logger } from '../logger/index.js';
import fs from 'fs';

export interface MediaJobData {
  type: 'cleanup-local' | 'process-image' | 'generate-thumbnail';
  filePath?: string;
  publicId?: string;
  mediaFileId?: string;
}

export function startMediaWorker(): Worker<MediaJobData> {
  const env = getEnv();

  const worker = new Worker<MediaJobData>(
    'media-queue',
    async (job: Job<MediaJobData>) => {
      logger.debug('Processing media job', { jobId: job.id, type: job.data.type });

      switch (job.data.type) {
        case 'cleanup-local': {
          const { filePath } = job.data;
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.debug('Deleted local temp file', { filePath });
          }
          break;
        }

        case 'process-image': {
          const { mediaFileId } = job.data;
          if (mediaFileId) {
            await MediaFileModel.findByIdAndUpdate(mediaFileId, { status: 'ready' });
          }
          break;
        }

        case 'generate-thumbnail': {
          const { mediaFileId, publicId } = job.data;
          if (mediaFileId && publicId) {
            const thumbnail = cloudinaryService.getThumbnailUrl(publicId, 300, 300);
            await MediaFileModel.findByIdAndUpdate(mediaFileId, { thumbnail, status: 'ready' });
          }
          break;
        }

        default:
          logger.warn('Unknown media job type', { type: job.data.type });
      }
    },
    {
      connection: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
        db: env.REDIS_DB,
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('Media job failed', { jobId: job?.id, err });
  });

  return worker;
}
