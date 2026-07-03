import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { MediaFileModel } from '../../../database/models/MediaFile.js';
import { MediaRepository } from '../repository/index.js';
import { MediaService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock cloudinary service — generate unique publicId each call to avoid unique-index collisions
let _uploadCallCount = 0;
jest.mock('../../../services/cloudinary.js', () => ({
  cloudinaryService: {
    upload: jest.fn().mockImplementation(() => {
      _uploadCallCount++;
      const id = `test${_uploadCallCount}`;
      return Promise.resolve({
        url:          `https://res.cloudinary.com/test/image/upload/${id}.jpg`,
        secureUrl:    `https://res.cloudinary.com/test/image/upload/${id}.jpg`,
        publicId:     `truson/users/user1/images/${id}`,
        resourceType: 'image',
        format:       'jpg',
        width:        800,
        height:       600,
        bytes:        12345,
        thumbnailUrl: `https://res.cloudinary.com/test/image/upload/w_400,h_400/${id}.webp`,
      });
    }),
    delete:          jest.fn().mockResolvedValue(undefined),
    getThumbnailUrl: jest.fn().mockReturnValue('https://res.cloudinary.com/test/thumb.webp'),
  },
}));

// Mock queues to avoid Redis dependency
jest.mock('../../../queues/index.js', () => ({
  getMediaQueue: jest.fn().mockImplementation(() => {
    throw new Error('Queue not initialised');
  }),
}));

// Mock fs so we don't need real files on disk
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync:  jest.fn(),
}));

// Mock env
jest.mock('../../../config/env.js', () => ({
  getEnv: jest.fn().mockReturnValue({
    CLOUDINARY_CLOUD_NAME: 'testcloud',
    CLOUDINARY_API_KEY:    'testkey',
    CLOUDINARY_API_SECRET: 'testsecret',
    UPLOAD_DIR:            './uploads',
    NODE_ENV:              'test',
    TENOR_API_KEY:         undefined,
  }),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname:    'file',
    originalname: 'test-image.jpg',
    encoding:     '7bit',
    mimetype:     'image/jpeg',
    size:         12345,
    path:         path.join('/tmp', 'test-image.jpg'),
    destination:  '/tmp',
    filename:     'test-image.jpg',
    buffer:       Buffer.alloc(0),
    stream:       null as unknown as fs.ReadStream,
    ...overrides,
  };
}

const USER_ID = new mongoose.Types.ObjectId().toString();
const CONV_ID = new mongoose.Types.ObjectId().toString();

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mongod: MongoMemoryServer;
let service: MediaService;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  service = new MediaService(new MediaRepository());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await MediaFileModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// uploadFile
// ---------------------------------------------------------------------------

describe('MediaService.uploadFile', () => {
  it('should upload a file successfully and return response', async () => {
    const file = makeMockFile();
    const result = await service.uploadFile(USER_ID, file, { conversationId: CONV_ID });

    expect(result).toMatchObject({
      mimeType:     'image/jpeg',
      size:         12345,
      originalName: 'test-image.jpg',
      type:         'image',
      status:       'ready',
    });
    expect(result.url).toContain('res.cloudinary.com');
    expect(result.publicId).toContain('truson/users/user1/images/');
    expect(result._id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it('should set type to voice_note when isVoiceNote is true', async () => {
    const file = makeMockFile({ mimetype: 'audio/ogg', originalname: 'voice.ogg' });
    const result = await service.uploadFile(USER_ID, file, { isVoiceNote: true });

    expect(result.type).toBe('voice_note');
  });

  it('should set type to gif for image/gif mimetype', async () => {
    const file = makeMockFile({ mimetype: 'image/gif', originalname: 'funny.gif' });
    const result = await service.uploadFile(USER_ID, file, {});

    expect(result.type).toBe('gif');
  });

  it('should throw UPLOAD_FAILED when Cloudinary upload fails', async () => {
    const { cloudinaryService } = await import('../../../services/cloudinary.js');
    (cloudinaryService.upload as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const file = makeMockFile();
    await expect(service.uploadFile(USER_ID, file, {})).rejects.toMatchObject({
      code:       'UPLOAD_FAILED',
      statusCode: 500,
    });
  });

  it('should persist a MediaFile record in the database', async () => {
    const file = makeMockFile();
    const result = await service.uploadFile(USER_ID, file, { conversationId: CONV_ID });

    const dbRecord = await MediaFileModel.findById(result._id).lean();
    expect(dbRecord).toBeTruthy();
    expect(dbRecord?.mimeType).toBe('image/jpeg');
    expect(dbRecord?.uploaderId.toString()).toBe(USER_ID);
  });
});

// ---------------------------------------------------------------------------
// getMedia
// ---------------------------------------------------------------------------

describe('MediaService.getMedia', () => {
  it('should return media for the owner', async () => {
    const file = makeMockFile();
    const uploaded = await service.uploadFile(USER_ID, file, {});

    const result = await service.getMedia(USER_ID, uploaded._id);
    expect(result._id).toBe(uploaded._id);
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('should throw NOT_FOUND for non-existent media', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(service.getMedia(USER_ID, fakeId)).rejects.toMatchObject({
      code:       'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw FORBIDDEN for media owned by another user', async () => {
    const file = makeMockFile();
    const uploaded = await service.uploadFile(USER_ID, file, {});
    const otherUser = new mongoose.Types.ObjectId().toString();

    await expect(service.getMedia(otherUser, uploaded._id)).rejects.toMatchObject({
      code:       'FORBIDDEN',
      statusCode: 403,
    });
  });

  it('should throw NOT_FOUND for soft-deleted media', async () => {
    const file = makeMockFile();
    const uploaded = await service.uploadFile(USER_ID, file, {});
    await MediaFileModel.findByIdAndUpdate(uploaded._id, { deletedAt: new Date() });

    await expect(service.getMedia(USER_ID, uploaded._id)).rejects.toMatchObject({
      code:       'NOT_FOUND',
      statusCode: 404,
    });
  });
});

// ---------------------------------------------------------------------------
// deleteMedia
// ---------------------------------------------------------------------------

describe('MediaService.deleteMedia', () => {
  it('should soft-delete media for the owner', async () => {
    const file = makeMockFile();
    const uploaded = await service.uploadFile(USER_ID, file, {});

    await service.deleteMedia(USER_ID, uploaded._id);

    const dbRecord = await MediaFileModel.findById(uploaded._id).lean();
    expect(dbRecord?.deletedAt).toBeDefined();
    expect(dbRecord?.status).toBe('deleted');
  });

  it('should throw NOT_FOUND when deleting non-existent media', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(service.deleteMedia(USER_ID, fakeId)).rejects.toMatchObject({
      code:       'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('should throw FORBIDDEN when deleting media owned by another user', async () => {
    const file = makeMockFile();
    const uploaded = await service.uploadFile(USER_ID, file, {});
    const otherUser = new mongoose.Types.ObjectId().toString();

    await expect(service.deleteMedia(otherUser, uploaded._id)).rejects.toMatchObject({
      code:       'FORBIDDEN',
      statusCode: 403,
    });
  });
});

// ---------------------------------------------------------------------------
// getConversationMedia
// ---------------------------------------------------------------------------

describe('MediaService.getConversationMedia', () => {
  it('should return paginated media for a conversation', async () => {
    for (let i = 0; i < 3; i++) {
      await service.uploadFile(USER_ID, makeMockFile({ originalname: `img${i}.jpg` }), {
        conversationId: CONV_ID,
      });
    }

    const result = await service.getConversationMedia(USER_ID, {
      conversationId: CONV_ID,
      page:           1,
      limit:          10,
    });

    expect(result.total).toBe(3);
    expect(result.files).toHaveLength(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('should return empty when conversationId has no files', async () => {
    const otherConvId = new mongoose.Types.ObjectId().toString();
    const result = await service.getConversationMedia(USER_ID, {
      conversationId: otherConvId,
      page:           1,
      limit:          10,
    });

    expect(result.total).toBe(0);
    expect(result.files).toHaveLength(0);
  });

  it('should throw VALIDATION_ERROR when conversationId is missing', async () => {
    await expect(service.getConversationMedia(USER_ID, { page: 1, limit: 10 })).rejects.toMatchObject({
      code:       'VALIDATION_ERROR',
      statusCode: 400,
    });
  });

  it('should paginate correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await service.uploadFile(USER_ID, makeMockFile({ originalname: `img${i}.jpg` }), {
        conversationId: CONV_ID,
      });
    }

    const page1 = await service.getConversationMedia(USER_ID, {
      conversationId: CONV_ID,
      page:           1,
      limit:          2,
    });

    expect(page1.files).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
  });
});
