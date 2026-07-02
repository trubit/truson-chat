import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import { MutedUserModel } from '../../../database/models/MutedUser.js';
import { BlockRepository, MuteRepository } from '../repository/index.js';
import { BlockingService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await BlockedUserModel.deleteMany({});
  await MutedUserModel.deleteMany({});
  await UserModel.deleteMany({});
  await ProfileModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestUser(overrides: Partial<{ username: string; email: string }> = {}) {
  const user = await UserModel.create({
    username: overrides.username ?? 'testuser',
    email: overrides.email ?? 'test@example.com',
    passwordHash: 'hashed_password',
    role: 'user',
    status: 'active',
    emailVerified: true,
    phoneVerified: false,
  });

  await ProfileModel.create({
    userId: user._id,
    displayName: overrides.username ?? 'Test User',
    privacySettings: {
      profileVisibility: 'everyone',
      lastSeenVisibility: 'everyone',
      profilePhotoVisibility: 'everyone',
      aboutVisibility: 'everyone',
    },
  });

  return user;
}

function makeService() {
  const blockRepo = new BlockRepository();
  const muteRepo = new MuteRepository();
  return new BlockingService(blockRepo, muteRepo);
}

// ---------------------------------------------------------------------------
// blockUser
// ---------------------------------------------------------------------------

describe('BlockingService.blockUser', () => {
  it('happy path blocks a user and returns block data', async () => {
    const blocker = await createTestUser({ username: 'blocker1', email: 'blocker1@example.com' });
    const blocked = await createTestUser({ username: 'blocked1', email: 'blocked1@example.com' });

    const service = makeService();
    const result = await service.blockUser(blocker._id.toString(), blocked._id.toString(), {});

    expect(result.blockedUser.id).toBe(blocked._id.toString());
    expect(result.blockedUser.username).toBe('blocked1');
    expect(result.createdAt).toBeTruthy();
  });

  it('stores an optional reason on the block record', async () => {
    const blocker = await createTestUser({ username: 'blocker2', email: 'blocker2@example.com' });
    const blocked = await createTestUser({ username: 'blocked2', email: 'blocked2@example.com' });

    const service = makeService();
    const result = await service.blockUser(blocker._id.toString(), blocked._id.toString(), {
      reason: 'Harassment',
    });

    expect(result.reason).toBe('Harassment');
  });

  it('rejects self-block with CANNOT_BLOCK_SELF', async () => {
    const user = await createTestUser({ username: 'selfblock1', email: 'selfblock1@example.com' });
    const service = makeService();

    await expect(
      service.blockUser(user._id.toString(), user._id.toString(), {}),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANNOT_BLOCK_SELF' });
  });

  it('rejects blocking an already-blocked user with ALREADY_BLOCKED', async () => {
    const blocker = await createTestUser({ username: 'blocker3', email: 'blocker3@example.com' });
    const blocked = await createTestUser({ username: 'blocked3', email: 'blocked3@example.com' });

    const service = makeService();
    await service.blockUser(blocker._id.toString(), blocked._id.toString(), {});

    await expect(
      service.blockUser(blocker._id.toString(), blocked._id.toString(), {}),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_BLOCKED' });
  });

  it('throws USER_NOT_FOUND for a non-existent target', async () => {
    const blocker = await createTestUser({ username: 'blocker4', email: 'blocker4@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.blockUser(blocker._id.toString(), fakeId, {}),
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// unblockUser
// ---------------------------------------------------------------------------

describe('BlockingService.unblockUser', () => {
  it('happy path removes a block', async () => {
    const blocker = await createTestUser({ username: 'unblocker1', email: 'unblocker1@example.com' });
    const blocked = await createTestUser({ username: 'unblocked1', email: 'unblocked1@example.com' });

    const service = makeService();
    await service.blockUser(blocker._id.toString(), blocked._id.toString(), {});

    await expect(
      service.unblockUser(blocker._id.toString(), blocked._id.toString()),
    ).resolves.toBeUndefined();

    const doc = await BlockedUserModel.findOne({
      blockerId: blocker._id,
      blockedId: blocked._id,
    }).exec();
    expect(doc).toBeNull();
  });

  it('rejects unblocking a user that was not blocked with BLOCK_NOT_FOUND', async () => {
    const blocker = await createTestUser({ username: 'unblocker2', email: 'unblocker2@example.com' });
    const notBlocked = await createTestUser({ username: 'notblocked1', email: 'notblocked1@example.com' });

    const service = makeService();
    await expect(
      service.unblockUser(blocker._id.toString(), notBlocked._id.toString()),
    ).rejects.toMatchObject({ statusCode: 404, code: 'BLOCK_NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// muteUser
// ---------------------------------------------------------------------------

describe('BlockingService.muteUser', () => {
  it('happy path mutes a user and returns mute data', async () => {
    const muter = await createTestUser({ username: 'muter1', email: 'muter1@example.com' });
    const muted = await createTestUser({ username: 'muted1', email: 'muted1@example.com' });

    const service = makeService();
    const result = await service.muteUser(muter._id.toString(), muted._id.toString(), {
      mutedNotifications: true,
      mutedMessages: false,
    });

    expect(result.mutedUser.id).toBe(muted._id.toString());
    expect(result.mutedNotifications).toBe(true);
    expect(result.mutedMessages).toBe(false);
  });

  it('rejects self-mute with CANNOT_MUTE_SELF', async () => {
    const user = await createTestUser({ username: 'selfmute1', email: 'selfmute1@example.com' });
    const service = makeService();

    await expect(
      service.muteUser(user._id.toString(), user._id.toString(), {}),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANNOT_MUTE_SELF' });
  });

  it('updates existing mute when called again', async () => {
    const muter = await createTestUser({ username: 'muter2', email: 'muter2@example.com' });
    const muted = await createTestUser({ username: 'muted2', email: 'muted2@example.com' });

    const service = makeService();
    await service.muteUser(muter._id.toString(), muted._id.toString(), {
      mutedNotifications: true,
      mutedMessages: true,
    });

    const result = await service.muteUser(muter._id.toString(), muted._id.toString(), {
      mutedMessages: false,
    });

    expect(result.mutedMessages).toBe(false);
  });

  it('throws USER_NOT_FOUND for a non-existent target', async () => {
    const muter = await createTestUser({ username: 'muter3', email: 'muter3@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.muteUser(muter._id.toString(), fakeId, {}),
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// unmuteUser
// ---------------------------------------------------------------------------

describe('BlockingService.unmuteUser', () => {
  it('happy path removes a mute', async () => {
    const muter = await createTestUser({ username: 'unmuter1', email: 'unmuter1@example.com' });
    const muted = await createTestUser({ username: 'unmuted1', email: 'unmuted1@example.com' });

    const service = makeService();
    await service.muteUser(muter._id.toString(), muted._id.toString(), {});

    await expect(
      service.unmuteUser(muter._id.toString(), muted._id.toString()),
    ).resolves.toBeUndefined();

    const doc = await MutedUserModel.findOne({
      muterId: muter._id,
      mutedId: muted._id,
    }).exec();
    expect(doc).toBeNull();
  });

  it('rejects unmuting a user that was not muted with MUTE_NOT_FOUND', async () => {
    const muter = await createTestUser({ username: 'unmuter2', email: 'unmuter2@example.com' });
    const notMuted = await createTestUser({ username: 'notmuted1', email: 'notmuted1@example.com' });

    const service = makeService();
    await expect(
      service.unmuteUser(muter._id.toString(), notMuted._id.toString()),
    ).rejects.toMatchObject({ statusCode: 404, code: 'MUTE_NOT_FOUND' });
  });
});
