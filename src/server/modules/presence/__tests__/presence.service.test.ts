import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PresenceModel } from '../../../database/models/Presence.js';
import { PresenceRepository } from '../repository/index.js';
import { PresenceService } from '../service/index.js';

// ---------------------------------------------------------------------------
// Mock the Redis connection so the presence service can be imported without
// needing a real Redis client.  All Redis calls in the service are wrapped in
// try/catch with graceful degradation, so returning resolved promises (or
// throwing) is sufficient for unit tests.
// ---------------------------------------------------------------------------

jest.mock('../../../redis/connection.js', () => {
  const mockClient = {
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    sismember: jest.fn().mockResolvedValue(0),
    pipeline: jest.fn().mockReturnValue({
      sismember: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
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
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri());
}, 70000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await PresenceModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const repo = new PresenceRepository();
  return new PresenceService(repo);
}

function newId(): string {
  return new mongoose.Types.ObjectId().toString();
}

// ---------------------------------------------------------------------------
// updatePresence
// ---------------------------------------------------------------------------

describe('PresenceService.updatePresence', () => {
  it('creates a presence record when none exists and returns data', async () => {
    const userId = newId();
    const service = makeService();

    const result = await service.updatePresence(userId, { status: 'online' });

    expect(result.userId).toBe(userId);
    expect(result.status).toBe('online');
    expect(result.lastSeen).toBeTruthy();
  });

  it('updates an existing presence record', async () => {
    const userId = newId();
    const service = makeService();

    await service.updatePresence(userId, { status: 'online' });
    const result = await service.updatePresence(userId, { status: 'away' });

    expect(result.status).toBe('away');
  });

  it('sets lastSeen when status is "offline"', async () => {
    const userId = newId();
    const service = makeService();

    const before = new Date();
    await service.updatePresence(userId, { status: 'offline' });
    const after = new Date();

    const presence = await PresenceModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();

    expect(presence?.lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(presence?.lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('sets lastSeen when status is "invisible"', async () => {
    const userId = newId();
    const service = makeService();

    await service.updatePresence(userId, { status: 'invisible' });

    const presence = await PresenceModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();

    expect(presence?.lastSeen).toBeDefined();
  });

  it('stores a custom status message', async () => {
    const userId = newId();
    const service = makeService();

    const result = await service.updatePresence(userId, {
      status: 'busy',
      statusMessage: 'In a meeting',
    });

    expect(result.statusMessage).toBe('In a meeting');
  });

  it('calls Redis setex when status is "online"', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { setex: jest.Mock };
    };

    const userId = newId();
    const service = makeService();

    await service.updatePresence(userId, { status: 'online' });

    expect(redisClient.setex).toHaveBeenCalledWith(
      `presence:${userId}`,
      expect.any(Number),
      expect.any(String),
    );
  });

  it('calls Redis del when status is "offline"', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { del: jest.Mock };
    };

    const userId = newId();
    const service = makeService();

    await service.updatePresence(userId, { status: 'offline' });

    expect(redisClient.del).toHaveBeenCalledWith(`presence:${userId}`);
  });
});

// ---------------------------------------------------------------------------
// setUserOnline
// ---------------------------------------------------------------------------

describe('PresenceService.setUserOnline', () => {
  it('sets user status to online in DB', async () => {
    const userId = newId();
    const service = makeService();

    await service.setUserOnline(userId);

    const presence = await PresenceModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();

    expect(presence?.status).toBe('online');
  });

  it('calls Redis setex and sadd', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { setex: jest.Mock; sadd: jest.Mock };
    };

    const userId = newId();
    const service = makeService();

    await service.setUserOnline(userId);

    expect(redisClient.setex).toHaveBeenCalledWith(
      `presence:${userId}`,
      expect.any(Number),
      expect.any(String),
    );
    expect(redisClient.sadd).toHaveBeenCalledWith('online_users', userId);
  });

  it('resolves without error even when called twice', async () => {
    const userId = newId();
    const service = makeService();

    await expect(service.setUserOnline(userId)).resolves.toBeUndefined();
    await expect(service.setUserOnline(userId)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setUserOffline
// ---------------------------------------------------------------------------

describe('PresenceService.setUserOffline', () => {
  it('sets status to offline and updates lastSeen in DB', async () => {
    const userId = newId();
    const service = makeService();

    await service.setUserOnline(userId);

    const before = new Date();
    await service.setUserOffline(userId);
    const after = new Date();

    const presence = await PresenceModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();

    expect(presence?.status).toBe('offline');
    expect(presence?.lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(presence?.lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('calls Redis del and srem', async () => {
    const { redisClient } = jest.requireMock('../../../redis/connection.js') as {
      redisClient: { del: jest.Mock; srem: jest.Mock };
    };

    const userId = newId();
    const service = makeService();

    await service.setUserOffline(userId);

    expect(redisClient.del).toHaveBeenCalledWith(`presence:${userId}`);
    expect(redisClient.srem).toHaveBeenCalledWith('online_users', userId);
  });

  it('resolves without error for a user with no prior presence record', async () => {
    const userId = newId();
    const service = makeService();

    await expect(service.setUserOffline(userId)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getPresence
// ---------------------------------------------------------------------------

describe('PresenceService.getPresence', () => {
  it('returns offline status for a user with no presence record', async () => {
    const requesterId = newId();
    const targetId = newId();
    const service = makeService();

    const result = await service.getPresence(requesterId, targetId);

    expect(result.userId).toBe(targetId);
    expect(result.status).toBe('offline');
  });

  it('hides "invisible" status as "offline" for non-self', async () => {
    const requesterId = newId();
    const targetId = newId();
    const service = makeService();

    await service.updatePresence(targetId, { status: 'invisible' });

    const result = await service.getPresence(requesterId, targetId);

    expect(result.status).toBe('offline');
  });

  it('returns true "invisible" status when requester is the same user', async () => {
    const userId = newId();
    const service = makeService();

    await service.updatePresence(userId, { status: 'invisible' });

    const result = await service.getPresence(userId, userId);

    expect(result.status).toBe('invisible');
  });

  it('throws INVALID_ID for a malformed user ID', async () => {
    const requesterId = newId();
    const service = makeService();

    await expect(
      service.getPresence(requesterId, 'not-an-id'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ID' });
  });
});

// ---------------------------------------------------------------------------
// getOwnPresence
// ---------------------------------------------------------------------------

describe('PresenceService.getOwnPresence', () => {
  it('creates and returns presence if none exists', async () => {
    const userId = newId();
    const service = makeService();

    const result = await service.getOwnPresence(userId);

    expect(result.userId).toBe(userId);
    expect(result.status).toBeDefined();
  });
});
