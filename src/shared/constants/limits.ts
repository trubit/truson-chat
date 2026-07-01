export const LIMITS = {
  MAX_FILE_SIZE: 52_428_800,       // 50 MB
  MAX_IMAGE_SIZE: 10_485_760,      // 10 MB
  MAX_VIDEO_SIZE: 104_857_600,     // 100 MB
  MAX_AUDIO_SIZE: 26_214_400,      // 25 MB
  MAX_DOCUMENT_SIZE: 52_428_800,   // 50 MB
  MAX_GROUP_MEMBERS: 1024,
  MAX_BIO_LENGTH: 500,
  MAX_MESSAGE_LENGTH: 4096,
  MAX_GROUP_NAME_LENGTH: 64,
  MESSAGES_PER_PAGE: 50,
  CONVERSATIONS_PER_PAGE: 30,
  NOTIFICATIONS_PER_PAGE: 20,
  SEARCH_RESULTS_PER_PAGE: 20,
  TYPING_INDICATOR_TIMEOUT_MS: 3000,
  PRESENCE_HEARTBEAT_MS: 15_000,
  PRESENCE_TTL_MS: 30_000,
} as const;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'] as const;
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'] as const;
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
] as const;

export const ALLOWED_MEDIA_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const;
