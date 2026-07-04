import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ProfileModel } from '../../../database/models/Profile.js';
import { UserPreferencesModel } from '../../../database/models/UserPreferences.js';
import { AuditLogModel } from '../../../database/models/AuditLog.js';
import { UserModel } from '../../../database/models/User.js';
import { ProfileRepository } from '../repository/index.js';
import { ProfileService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Mock Cloudinary to prevent real network calls
// ---------------------------------------------------------------------------

jest.mock('../../../cloudinary/index.js', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    publicId: 'truson-chat/avatars/test123',
    url: 'http://res.cloudinary.com/test/image/upload/test123',
    secureUrl: 'https://res.cloudinary.com/test/image/upload/test123',
    width: 400,
    height: 400,
    format: 'webp',
    resourceType: 'image',
    bytes: 12345,
    createdAt: new Date().toISOString(),
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(undefined),
}));

// Mock env to make Cloudinary appear configured
jest.mock('../../../config/env.js', () => ({
  getEnv: jest.fn().mockReturnValue({
    CLOUDINARY_CLOUD_NAME: 'testcloud',
    CLOUDINARY_API_KEY: 'testkey',
    CLOUDINARY_API_SECRET: 'testsecret',
    UPLOAD_DIR: './uploads',
    NODE_ENV: 'test',
  }),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri());
}, 70000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await ProfileModel.deleteMany({});
  await UserPreferencesModel.deleteMany({});
  await AuditLogModel.deleteMany({});
  await UserModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestProfile(overrides: Partial<{
  userId: mongoose.Types.ObjectId;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  statusMessage: string;
  privacySettings: Partial<{
    profileVisibility: 'everyone' | 'contacts' | 'nobody';
    lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
    profilePhotoVisibility: 'everyone' | 'contacts' | 'nobody';
    aboutVisibility: 'everyone' | 'contacts' | 'nobody';
  }>;
}> = {}) {
  const userId = overrides.userId ?? new mongoose.Types.ObjectId();
  return ProfileModel.create({
    userId,
    displayName: overrides.displayName ?? 'Test User',
    bio: overrides.bio,
    location: overrides.location,
    website: overrides.website,
    statusMessage: overrides.statusMessage,
    privacySettings: {
      profileVisibility: overrides.privacySettings?.profileVisibility ?? 'everyone',
      lastSeenVisibility: overrides.privacySettings?.lastSeenVisibility ?? 'everyone',
      profilePhotoVisibility: overrides.privacySettings?.profilePhotoVisibility ?? 'everyone',
      aboutVisibility: overrides.privacySettings?.aboutVisibility ?? 'everyone',
    },
  });
}

function makeService() {
  const repo = new ProfileRepository();
  return new ProfileService(repo);
}

// ---------------------------------------------------------------------------
// getProfile — privacy settings
// ---------------------------------------------------------------------------

describe('ProfileService.getProfile', () => {
  it('returns full profile to the owner', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createTestProfile({
      userId,
      displayName: 'Owner User',
      bio: 'My bio',
      location: 'Earth',
      privacySettings: { aboutVisibility: 'nobody' },
    });

    const service = makeService();
    const result = await service.getProfile(userId.toString(), userId.toString());

    expect(result.displayName).toBe('Owner User');
    // Owner sees everything regardless of privacy
    expect(result.bio).toBe('My bio');
    expect(result.location).toBe('Earth');
  });

  it('hides bio/location when aboutVisibility is "nobody" for non-owner', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const viewerId = new mongoose.Types.ObjectId();

    await createTestProfile({
      userId: ownerId,
      displayName: 'Private User',
      bio: 'Secret bio',
      location: 'Hidden',
      privacySettings: { aboutVisibility: 'nobody' },
    });

    const service = makeService();
    const result = await service.getProfile(viewerId.toString(), ownerId.toString());

    expect(result.displayName).toBe('Private User');
    expect(result.bio).toBeUndefined();
    expect(result.location).toBeUndefined();
  });

  it('hides bio/location when aboutVisibility is "contacts" for unauthenticated viewer', async () => {
    const ownerId = new mongoose.Types.ObjectId();

    await createTestProfile({
      userId: ownerId,
      displayName: 'Contacts Only',
      bio: 'Contacts bio',
      privacySettings: { aboutVisibility: 'contacts' },
    });

    const service = makeService();
    // viewerId undefined = unauthenticated
    const result = await service.getProfile(undefined, ownerId.toString());

    expect(result.bio).toBeUndefined();
  });

  it('shows bio when aboutVisibility is "contacts" for authenticated viewer', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const viewerId = new mongoose.Types.ObjectId();

    await createTestProfile({
      userId: ownerId,
      displayName: 'Contacts Only',
      bio: 'Contacts bio',
      privacySettings: { aboutVisibility: 'contacts' },
    });

    const service = makeService();
    const result = await service.getProfile(viewerId.toString(), ownerId.toString());

    // For Phase 3, authenticated users are treated as contacts
    expect(result.bio).toBe('Contacts bio');
  });

  it('hides avatar when profilePhotoVisibility is "nobody"', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const viewerId = new mongoose.Types.ObjectId();

    const profile = await ProfileModel.create({
      userId: ownerId,
      displayName: 'No Avatar',
      privacySettings: {
        profileVisibility: 'everyone',
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'nobody',
        aboutVisibility: 'everyone',
      },
      avatar: { url: 'https://cdn.example.com/avatar.jpg', publicId: 'test/avatar' },
    });

    expect(profile.avatar).toBeDefined();

    const service = makeService();
    const result = await service.getProfile(viewerId.toString(), ownerId.toString());

    expect(result.avatar).toBeUndefined();
  });

  it('throws 404 for non-existent profile', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(service.getProfile(undefined, fakeId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PROFILE_NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

describe('ProfileService.updateProfile', () => {
  it('updates displayName and bio', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createTestProfile({ userId, displayName: 'Old Name' });

    const service = makeService();
    const result = await service.updateProfile(
      userId.toString(),
      { displayName: 'New Name', bio: 'Updated bio' },
      '127.0.0.1',
      'Test/1.0',
    );

    expect(result.displayName).toBe('New Name');
    expect(result.bio).toBe('Updated bio');
  });

  it('creates an audit log entry on update', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createTestProfile({ userId });

    const service = makeService();
    await service.updateProfile(
      userId.toString(),
      { displayName: 'Audit Test' },
      '10.0.0.1',
      'AuditTest/1.0',
    );

    const logs = await AuditLogModel.find({ userId }).exec();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.action).toBe('profile.update');
  });

  it('throws 404 when profile does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.updateProfile(fakeId, { displayName: 'Ghost' }, '127.0.0.1', 'Test/1.0'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ---------------------------------------------------------------------------
// updatePrivacy
// ---------------------------------------------------------------------------

describe('ProfileService.updatePrivacy', () => {
  it('changes profileVisibility setting', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createTestProfile({ userId, privacySettings: { profileVisibility: 'everyone' } });

    const service = makeService();
    const result = await service.updatePrivacy(
      userId.toString(),
      { profileVisibility: 'contacts' },
      '127.0.0.1',
      'Test/1.0',
    );

    expect(result.privacySettings.profileVisibility).toBe('contacts');
  });

  it('updates all visibility fields at once', async () => {
    const userId = new mongoose.Types.ObjectId();
    await createTestProfile({ userId });

    const service = makeService();
    const result = await service.updatePrivacy(
      userId.toString(),
      {
        profileVisibility: 'nobody',
        lastSeenVisibility: 'contacts',
        profilePhotoVisibility: 'nobody',
        aboutVisibility: 'contacts',
      },
      '127.0.0.1',
      'Test/1.0',
    );

    expect(result.privacySettings.profileVisibility).toBe('nobody');
    expect(result.privacySettings.lastSeenVisibility).toBe('contacts');
    expect(result.privacySettings.profilePhotoVisibility).toBe('nobody');
    expect(result.privacySettings.aboutVisibility).toBe('contacts');
  });
});

// ---------------------------------------------------------------------------
// getPreferences
// ---------------------------------------------------------------------------

describe('ProfileService.getPreferences', () => {
  it('returns default preferences when none exist', async () => {
    const userId = new mongoose.Types.ObjectId();

    const service = makeService();
    const result = await service.getPreferences(userId.toString());

    expect(result.theme).toBe('system');
    expect(result.language).toBe('en');
    expect(result.notifications).toMatchObject({ email: true, push: true, inApp: true });
  });

  it('returns existing preferences', async () => {
    const userId = new mongoose.Types.ObjectId();
    await UserPreferencesModel.create({
      userId,
      theme: 'dark',
      language: 'fr',
    });

    const service = makeService();
    const result = await service.getPreferences(userId.toString());

    expect(result.theme).toBe('dark');
    expect(result.language).toBe('fr');
  });
});

// ---------------------------------------------------------------------------
// updatePreferences
// ---------------------------------------------------------------------------

describe('ProfileService.updatePreferences', () => {
  it('merges partial notification updates', async () => {
    const userId = new mongoose.Types.ObjectId();

    const service = makeService();
    const result = await service.updatePreferences(userId.toString(), {
      notifications: { marketing: true, sms: true },
      theme: 'light',
    });

    expect(result.theme).toBe('light');
    expect((result.notifications as Record<string, boolean>)['marketing']).toBe(true);
    expect((result.notifications as Record<string, boolean>)['sms']).toBe(true);
    // Defaults preserved
    expect((result.notifications as Record<string, boolean>)['email']).toBe(true);
  });

  it('merges partial accessibility updates', async () => {
    const userId = new mongoose.Types.ObjectId();

    const service = makeService();
    const result = await service.updatePreferences(userId.toString(), {
      accessibility: { highContrast: true },
    });

    expect((result.accessibility as Record<string, unknown>)['highContrast']).toBe(true);
    expect((result.accessibility as Record<string, unknown>)['reducedMotion']).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// uploadAvatar / removeAvatar
// ---------------------------------------------------------------------------

describe('ProfileService.uploadAvatar', () => {
  it('uploads avatar and stores url/publicId', async () => {
    const { uploadToCloudinary } = jest.requireMock('../../../cloudinary/index.js') as {
      uploadToCloudinary: jest.Mock;
    };

    const userId = new mongoose.Types.ObjectId();
    await createTestProfile({ userId });

    const fakeFile = {
      buffer: Buffer.from('fake image data'),
      path: undefined,
      mimetype: 'image/jpeg',
      originalname: 'avatar.jpg',
      size: 1024,
    } as unknown as Express.Multer.File;

    const service = makeService();
    const result = await service.uploadAvatar(userId.toString(), fakeFile, '127.0.0.1', 'Test/1.0');

    expect(uploadToCloudinary).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ folder: 'truson-chat/avatars' }),
    );
    expect(result.avatar).toMatchObject({
      url: expect.stringContaining('cloudinary.com'),
      publicId: 'truson-chat/avatars/test123',
    });
  });

  it('deletes old avatar from Cloudinary before uploading new one', async () => {
    const { deleteFromCloudinary } = jest.requireMock('../../../cloudinary/index.js') as {
      deleteFromCloudinary: jest.Mock;
    };

    const userId = new mongoose.Types.ObjectId();
    await ProfileModel.create({
      userId,
      displayName: 'Has Avatar',
      avatar: { url: 'https://example.com/old.jpg', publicId: 'old/avatar123' },
      privacySettings: {
        profileVisibility: 'everyone',
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'everyone',
        aboutVisibility: 'everyone',
      },
    });

    const fakeFile = {
      buffer: Buffer.from('new image data'),
      path: undefined,
      mimetype: 'image/jpeg',
      originalname: 'new_avatar.jpg',
      size: 2048,
    } as unknown as Express.Multer.File;

    const service = makeService();
    await service.uploadAvatar(userId.toString(), fakeFile, '127.0.0.1', 'Test/1.0');

    expect(deleteFromCloudinary).toHaveBeenCalledWith('old/avatar123');
  });
});

describe('ProfileService.removeAvatar', () => {
  it('removes avatar from profile and Cloudinary', async () => {
    const { deleteFromCloudinary } = jest.requireMock('../../../cloudinary/index.js') as {
      deleteFromCloudinary: jest.Mock;
    };

    const userId = new mongoose.Types.ObjectId();
    await ProfileModel.create({
      userId,
      displayName: 'Has Avatar',
      avatar: { url: 'https://example.com/avatar.jpg', publicId: 'test/avatar456' },
      privacySettings: {
        profileVisibility: 'everyone',
        lastSeenVisibility: 'everyone',
        profilePhotoVisibility: 'everyone',
        aboutVisibility: 'everyone',
      },
    });

    const service = makeService();
    const result = await service.removeAvatar(userId.toString(), '127.0.0.1', 'Test/1.0');

    expect(deleteFromCloudinary).toHaveBeenCalledWith('test/avatar456');
    expect(result.avatar).toBeUndefined();
  });
});
