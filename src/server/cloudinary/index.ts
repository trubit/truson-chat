import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse, TransformationOptions } from 'cloudinary';
import sharp from 'sharp';
import { getEnv } from '../config/env.js';
import { logger } from '../logger/index.js';

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

export function cloudinaryConfig(): void {
  const env = getEnv();
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Eagerly apply config when the module is first imported
cloudinaryConfig();

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  /** Resource type: 'image' | 'video' | 'raw' | 'auto'. Defaults to 'image'. */
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  /** Max width to resize to before uploading (sharp pre-processing). */
  maxWidth?: number;
  /** Max height to resize to before uploading (sharp pre-processing). */
  maxHeight?: number;
  /** JPEG/WebP quality 1–100. Defaults to 85. */
  quality?: number;
  /** Convert to this output format. Defaults to 'webp'. */
  outputFormat?: 'webp' | 'jpeg' | 'png' | 'avif';
  /** Additional Cloudinary upload options. */
  cloudinaryOptions?: Partial<UploadApiOptions>;
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
  bytes: number;
  createdAt: string;
}

// --------------------------------------------------------------------------
// Image pre-processing with Sharp
// --------------------------------------------------------------------------

async function preprocessImage(
  input: Buffer,
  options: Pick<UploadOptions, 'maxWidth' | 'maxHeight' | 'quality' | 'outputFormat'>,
): Promise<Buffer> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 85, outputFormat = 'webp' } = options;

  let pipeline = sharp(input).rotate(); // auto-rotate based on EXIF

  // Resize only if the image exceeds max dimensions (never upscale)
  pipeline = pipeline.resize(maxWidth, maxHeight, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  switch (outputFormat) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
  }

  return pipeline.toBuffer();
}

// --------------------------------------------------------------------------
// Upload
// --------------------------------------------------------------------------

export async function uploadToCloudinary(
  input: Buffer | string,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const {
    folder = 'linkora',
    publicId,
    resourceType = 'image',
    cloudinaryOptions = {},
    ...imageOptions
  } = options;

  let uploadSource: Buffer | string = input;

  // Only pre-process binary image uploads
  if (Buffer.isBuffer(input) && resourceType === 'image') {
    try {
      uploadSource = await preprocessImage(input, imageOptions);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn('Sharp pre-processing failed, uploading original', { error: error.message });
      uploadSource = input; // fall through with original
    }
  }

  const uploadOptions: UploadApiOptions = {
    folder,
    public_id: publicId,
    resource_type: resourceType,
    overwrite: Boolean(publicId),
    unique_filename: !publicId,
    use_filename: Boolean(publicId),
    ...cloudinaryOptions,
  };

  return new Promise<UploadResult>((resolve, reject) => {
    const handleResult = (err: Error | undefined | null, result?: UploadApiResponse) => {
      if (err || !result) {
        const error = err ?? new Error('Cloudinary upload returned no result');
        logger.error('Cloudinary upload failed', { error: error.message, folder, publicId });
        reject(error);
        return;
      }

      logger.info('Cloudinary upload successful', {
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
      });

      resolve({
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        createdAt: result.created_at,
      });
    };

    if (Buffer.isBuffer(uploadSource)) {
      // Upload from buffer via stream
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, handleResult);
      uploadStream.end(uploadSource);
    } else {
      // Upload from URL or local file path
      void cloudinary.uploader.upload(uploadSource as string, uploadOptions, handleResult);
    }
  });
}

// --------------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------------

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true, // purge CDN cache
  });

  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(`Cloudinary delete failed for '${publicId}': ${result.result as string}`);
  }

  logger.info('Cloudinary asset deleted', { publicId, resourceType, result: result.result });
}

// --------------------------------------------------------------------------
// Image transformation helpers
// --------------------------------------------------------------------------

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'pad' | 'crop';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | number;
  format?: 'auto' | 'webp' | 'jpeg' | 'png' | 'avif';
  radius?: number | 'max';
}

export function buildImageUrl(publicId: string, transforms: TransformOptions = {}): string {
  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto',
    radius,
  } = transforms;

  const transformation: TransformationOptions = {
    width,
    height,
    crop,
    gravity,
    quality,
    fetch_format: format,
    ...(radius !== undefined ? { radius } : {}),
    dpr: 'auto',
  };

  return cloudinary.url(publicId, {
    transformation: [transformation],
    secure: true,
  });
}

export function buildAvatarUrl(publicId: string, size: 64 | 128 | 256 | 512 = 128): string {
  return buildImageUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto',
    radius: 'max',
  });
}

export function buildThumbnailUrl(publicId: string, width = 320, height = 240): string {
  return buildImageUrl(publicId, {
    width,
    height,
    crop: 'thumb',
    gravity: 'auto',
    quality: 'auto:eco',
    format: 'auto',
  });
}
