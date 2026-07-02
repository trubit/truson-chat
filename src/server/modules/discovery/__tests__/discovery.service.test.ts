import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import { FriendRequestModel } from '../../../database/models/FriendRequest.js';
import { FriendshipModel } from '../../../database/models/Friendship.js';
import { ContactModel } from '../../../database/models/Contact.js';
import { DiscoveryRepository } from '../repository/index.js';
import { DiscoveryService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Mock the Redis connection module so that the discovery service can be
// imported without a real Redis.  Recent-search operations use these mocks.
// ---------------------------------------------------------------------------

jest.mock('../../../redis/connection.js', () => {
  const mockClient = {
    lpush: jest.fn().mockResolvedValue(1),
    ltrim: jest.fn().mockResolvedValue('OK'),
    lrange: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
  };
  return {
    redisClient: mockClient,
    connectRedis: jest.fn().mockResolvedValue(undefined),
    disconnectRedis: jest.fn().mockResolvedValue(undefined),
  };
});

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
  await UserModel.deleteMany({});
  await ProfileModel.deleteMany({});
  await BlockedUserModel.deleteMany({});
  await FriendRequestModel.deleteMany({});
  await FriendshipModel.deleteMany({});
  await ContactModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type UserStatus = 'active' | 'suspended' | 'deleted' | 'pending_verification';

async function createTestUser(overrides: Partial<{
  username: string;
  email: string;
  status: UserStatus;
}> = {}) {
  const user = await UserModel.create({
    username: overrides.username ?? 'testuser',
    email: overrides.email ?? 'test@example.com',
    passwordHash: 'hashed_password',
    role: 'user',
    status: overrides.status ?? 'active',
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
  const repo = new DiscoveryRepository();
  return new DiscoveryService(repo);
}

// ---------------------------------------------------------------------------
// searchUsers
// ---------------------------------------------------------------------------

describe('DiscoveryService.searchUsers', () => {
  it('returns matching users by username', async () => {
    const requester = await createTestUser({ username: 'searcher1', email: 'searcher1@example.com' });
    await createTestUser({ username: 'alice123', email: 'alice123@example.com' });
    await createTestUser({ username: 'bob456', email: 'bob456@example.com' });

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), { q: 'alice' });

    expect(result.users.length).toBe(1);
    expect(result.users[0]?.username).toBe('alice123');
  });

  it('returns empty results when no users match the query', async () => {
    const requester = await createTestUser({ username: 'searcher2', email: 'searcher2@example.com' });
    await createTestUser({ username: 'charlie789', email: 'charlie789@example.com' });

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), { q: 'zzznoexist' });

    expect(result.users.length).toBe(0);
    expect(result.meta.total).toBe(0);
  });

  it('excludes the requester from search results', async () => {
    const requester = await createTestUser({
      username: 'searcherself',
      email: 'searcherself@example.com',
    });

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), { q: 'searcherself' });

    expect(result.users.find((u) => u.id === requester._id.toString())).toBeUndefined();
  });

  it('excludes users who have blocked the requester', async () => {
    const requester = await createTestUser({ username: 'searcher3', email: 'searcher3@example.com' });
    const blocker = await createTestUser({ username: 'dave001', email: 'dave001@example.com' });

    await BlockedUserModel.create({
      blockerId: blocker._id,
      blockedId: requester._id,
    });

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), { q: 'dave001' });

    expect(result.users.find((u) => u.id === blocker._id.toString())).toBeUndefined();
  });

  it('excludes users that the requester has blocked', async () => {
    const requester = await createTestUser({ username: 'searcher4', email: 'searcher4@example.com' });
    const blockedUser = await createTestUser({ username: 'eve002', email: 'eve002@example.com' });

    await BlockedUserModel.create({
      blockerId: requester._id,
      blockedId: blockedUser._id,
    });

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), { q: 'eve002' });

    expect(result.users.find((u) => u.id === blockedUser._id.toString())).toBeUndefined();
  });

  it('marks isFriend=true for an existing friend in results', async () => {
    const requester = await createTestUser({ username: 'searcher5', email: 'searcher5@example.com' });
    const friend = await createTestUser({ username: 'frank003', email: 'frank003@example.com' });

    const ids = [requester._id.toString(), friend._id.toString()].sort();
    await FriendshipModel.create({
      user1Id: new mongoose.Types.ObjectId(ids[0] as string),
      user2Id: new mongoose.Types.ObjectId(ids[1] as string),
    });

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), { q: 'frank003' });

    expect(result.users[0]?.isFriend).toBe(true);
  });

  it('returns paginated meta', async () => {
    const requester = await createTestUser({ username: 'pager1', email: 'pager1@example.com' });
    for (let i = 0; i < 5; i++) {
      await createTestUser({ username: `pageuser${i}`, email: `pageuser${i}@example.com` });
    }

    const service = makeService();
    const result = await service.searchUsers(requester._id.toString(), {
      q: 'pageuser',
      page: 1,
      limit: 2,
    });

    expect(result.users.length).toBe(2);
    expect(result.meta.total).toBe(5);
    expect(result.meta.hasMore).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRecentSearches
// ---------------------------------------------------------------------------

describe('DiscoveryService.getRecentSearches', () => {
  it('returns an empty array when lrange returns nothing', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    // Default mock returns []
    const result = await service.getRecentSearches(userId);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('parses and returns stored recent search entries from Redis', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { lrange: jest.Mock };
    };

    const entry = JSON.stringify({
      userId: 'u1',
      username: 'grace004',
      displayName: 'Grace',
      searchedAt: new Date().toISOString(),
    });
    lrange: redisClient.lrange.mockResolvedValueOnce([entry]);

    const userId = new mongoose.Types.ObjectId().toString();
    const service = makeService();
    const result = await service.getRecentSearches(userId);

    expect(result.length).toBe(1);
    expect(result[0]?.username).toBe('grace004');
  });

  it('gracefully returns [] if Redis throws', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { lrange: jest.Mock };
    };
    redisClient.lrange.mockRejectedValueOnce(new Error('Redis connection refused'));

    const userId = new mongoose.Types.ObjectId().toString();
    const service = makeService();
    const result = await service.getRecentSearches(userId);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// clearRecentSearches
// ---------------------------------------------------------------------------

describe('DiscoveryService.clearRecentSearches', () => {
  it('resolves without error', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(service.clearRecentSearches(userId)).resolves.toBeUndefined();
  });

  it('calls Redis del with the correct key', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { del: jest.Mock };
    };

    const userId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await service.clearRecentSearches(userId);

    expect(redisClient.del).toHaveBeenCalledWith(`recent_searches:${userId}`);
  });
});
