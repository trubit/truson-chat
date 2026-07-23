import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';
import { withRetry, withTimeout, CircuitBreaker } from '../utils/resilience.js';

// Configure once on import
const env = getEnv();
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type ResourceType = 'image' | 'video' | 'raw' | 'auto';

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  thumbnailUrl?: string;
}

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
  format?: string;
  fetch_format?: string;
}

class CloudinaryService {
  private readonly circuitBreaker = new CircuitBreaker('cloudinary', {
    failureThreshold: 5,
    successThreshold: 2,
    halfOpenTimeMs: 120_000,
  });

  private getFolder(userId: string, type: string): string {
    const map: Record<string, string> = {
      image: `linkora/users/${userId}/images`,
      video: `linkora/users/${userId}/videos`,
      audio: `linkora/users/${userId}/audio`,
      voice_note: `linkora/users/${userId}/voice-notes`,
      document: `linkora/users/${userId}/documents`,
      sticker: `linkora/stickers`,
      gif: `linkora/gifs`,
      raw: `linkora/users/${userId}/files`,
    };
    return map[type] ?? `linkora/users/${userId}/misc`;
  }

  private getResourceType(mimeType: string): ResourceType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary treats audio as video
    return 'raw';
  }

  async upload(
    filePath: string,
    opts: {
      userId: string;
      mediaType: string;
      mimeType: string;
      originalName: string;
      tags?: string[];
    },
  ): Promise<UploadResult> {
    const folder = this.getFolder(opts.userId, opts.mediaType);
    const resourceType = this.getResourceType(opts.mimeType);

    const uploadOpts: UploadApiOptions = {
      folder,
      resource_type: resourceType,
      tags: ['linkora', ...(opts.tags ?? [])],
      context: { original_name: opts.originalName, uploader: opts.userId },
      overwrite: false,
      unique_filename: true,
    };

    if (resourceType === 'image') {
      uploadOpts.quality = 'auto';
      uploadOpts.fetch_format = 'auto';
    }

    if (resourceType === 'video' && !opts.mimeType.startsWith('audio/')) {
      uploadOpts.eager = [{ format: 'jpg', width: 480, crop: 'scale', quality: 'auto' }];
      uploadOpts.eager_async = true;
    }

    const result: UploadApiResponse = await this.circuitBreaker.execute(() =>
      withRetry(
        () =>
          withTimeout(
            () => cloudinary.uploader.upload(filePath, uploadOpts),
            60_000,
            'Cloudinary upload timed out',
          ),
        {
          maxAttempts: 3,
          baseDelayMs: 1_000,
          maxDelayMs: 15_000,
          jitter: 'full',
          onRetry: (attempt, err, delayMs) => {
            logger.warn('Cloudinary upload retry', {
              attempt,
              error: err.message,
              delayMs,
              userId: opts.userId,
              mediaType: opts.mediaType,
            });
          },
        },
      ),
    );

    let thumbnailUrl: string | undefined;
    if (resourceType === 'image') {
      thumbnailUrl = cloudinary.url(result.public_id, {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto',
        format: 'webp',
        secure: true,
      });
    } else if (resourceType === 'video' && !opts.mimeType.startsWith('audio/')) {
      thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        width: 480,
        crop: 'scale',
        quality: 'auto',
        secure: true,
      });
    }

    return {
      url: result.secure_url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
      thumbnailUrl,
    };
  }

  async delete(publicId: string, resourceType: ResourceType = 'image'): Promise<void> {
    try {
      await this.circuitBreaker.execute(() =>
        withRetry(
          () =>
            withTimeout(
              () => cloudinary.uploader.destroy(publicId, { resource_type: resourceType }),
              15_000,
              'Cloudinary delete timed out',
            ),
          { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 10_000, jitter: 'full' },
        ),
      );
    } catch (err) {
      logger.warn('Failed to delete from Cloudinary', { err, publicId });
    }
  }

  getOptimizedUrl(
    publicId: string,
    opts: TransformOptions = {},
    resourceType: ResourceType = 'image',
  ): string {
    return cloudinary.url(publicId, {
      ...opts,
      resource_type: resourceType,
      secure: true,
      quality: opts.quality ?? 'auto',
      fetch_format: opts.format ?? 'auto',
    });
  }

  getThumbnailUrl(publicId: string, width = 300, height = 300): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      format: 'webp',
      secure: true,
    });
  }

  getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      expires_at: expiresAt,
      secure: true,
    });
  }
}

export const cloudinaryService = new CloudinaryService();
