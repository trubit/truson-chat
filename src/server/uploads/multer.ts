// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="multer" />
import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import type { Request } from 'express';
import { getEnv } from '../config/env.js';

// ---------------------------------------------------------------------------
// Ensure upload directory exists at module load time
// ---------------------------------------------------------------------------

const env = getEnv();
const UPLOAD_DIR = path.resolve(env.UPLOAD_DIR);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Storage engine — flat disk storage; organise by media type subdirectory
// ---------------------------------------------------------------------------

function createDiskStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_DIR, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
      cb(null, name);
    },
  });
}

// ---------------------------------------------------------------------------
// MIME-type allow lists
// ---------------------------------------------------------------------------

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/bmp',
  'image/tiff',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
]);

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/webm',
  'audio/aac',
  'audio/x-aac',
  'audio/flac',
  'audio/x-m4a',
  'audio/mp4', // M4A files reported by Chrome
  'audio/opus',
  'audio/x-ms-wma',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

const ALL_MEDIA_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
]);

// ---------------------------------------------------------------------------
// File-filter factory
// ---------------------------------------------------------------------------

function buildFileFilter(allowed: Set<string>) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowed.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new multer.MulterError('LIMIT_UNEXPECTED_FILE', `Unsupported MIME type: ${file.mimetype}`),
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Multer instances
// ---------------------------------------------------------------------------

const MAX_SIZE = env.MAX_FILE_SIZE_BYTES;

export const imageUpload = multer({
  storage: createDiskStorage('images'),
  fileFilter: buildFileFilter(IMAGE_MIME_TYPES),
  limits: { fileSize: MAX_SIZE, files: 10 },
});

export const videoUpload = multer({
  storage: createDiskStorage('videos'),
  fileFilter: buildFileFilter(VIDEO_MIME_TYPES),
  limits: { fileSize: MAX_SIZE, files: 1 },
});

export const audioUpload = multer({
  storage: createDiskStorage('audio'),
  fileFilter: buildFileFilter(AUDIO_MIME_TYPES),
  limits: { fileSize: MAX_SIZE, files: 5 },
});

export const documentUpload = multer({
  storage: createDiskStorage('documents'),
  fileFilter: buildFileFilter(DOCUMENT_MIME_TYPES),
  limits: { fileSize: MAX_SIZE, files: 5 },
});

export const mediaUpload = multer({
  storage: createDiskStorage('media'),
  fileFilter: buildFileFilter(ALL_MEDIA_MIME_TYPES),
  limits: { fileSize: MAX_SIZE, files: 10 },
});
