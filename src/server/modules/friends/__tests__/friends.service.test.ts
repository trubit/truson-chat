import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { FriendRequestModel } from '../../../database/models/FriendRequest.js';
import { FriendshipModel } from '../../../database/models/Friendship.js';
import { FriendRequestRepository, FriendshipRepository } from '../repository/index.js';
import { FriendsService } from '../service/index.js';

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
  await FriendRequestModel.deleteMany({});
  await FriendshipModel.deleteMany({});
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
  const requestRepo = new FriendRequestRepository();
  const friendshipRepo = new FriendshipRepository();
  return new FriendsService(requestRepo, friendshipRepo);
}

// ---------------------------------------------------------------------------
// sendRequest
// ---------------------------------------------------------------------------

describe('FriendsService.sendRequest', () => {
  it('happy path creates a pending friend request', async () => {
    const sender = await createTestUser({ username: 'sender1', email: 'sender1@example.com' });
    const recipient = await createTestUser({ username: 'recip1', email: 'recip1@example.com' });

    const service = makeService();
    const result = await service.sendRequest(sender._id.toString(), {
      userId: recipient._id.toString(),
    });

    expect(result.status).toBe('pending');
    expect(result.sender.username).toBe('sender1');
    expect(result.recipient.username).toBe('recip1');
  });

  it('rejects self-request with CANNOT_FRIEND_SELF', async () => {
    const user = await createTestUser({ username: 'selfuser1', email: 'selfuser1@example.com' });
    const service = makeService();

    await expect(
      service.sendRequest(user._id.toString(), { userId: user._id.toString() }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANNOT_FRIEND_SELF' });
  });

  it('rejects duplicate pending request with REQUEST_ALREADY_EXISTS', async () => {
    const sender = await createTestUser({ username: 'sender2', email: 'sender2@example.com' });
    const recipient = await createTestUser({ username: 'recip2', email: 'recip2@example.com' });

    const service = makeService();
    await service.sendRequest(sender._id.toString(), { userId: recipient._id.toString() });

    await expect(
      service.sendRequest(sender._id.toString(), { userId: recipient._id.toString() }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REQUEST_ALREADY_EXISTS' });
  });

  it('rejects if already friends with ALREADY_FRIENDS', async () => {
    const user1 = await createTestUser({ username: 'friend1a', email: 'friend1a@example.com' });
    const user2 = await createTestUser({ username: 'friend1b', email: 'friend1b@example.com' });

    // Create friendship directly
    const friendshipRepo = new FriendshipRepository();
    await friendshipRepo.create(user1._id.toString(), user2._id.toString());

    const service = makeService();
    await expect(
      service.sendRequest(user1._id.toString(), { userId: user2._id.toString() }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_FRIENDS' });
  });

  it('rejects request to non-existent user with USER_NOT_FOUND', async () => {
    const sender = await createTestUser({ username: 'sender3', email: 'sender3@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.sendRequest(sender._id.toString(), { userId: fakeId }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// acceptRequest
// ---------------------------------------------------------------------------

describe('FriendsService.acceptRequest', () => {
  it('happy path creates friendship and returns friend data', async () => {
    const sender = await createTestUser({ username: 'accsender1', email: 'accsender1@example.com' });
    const recipient = await createTestUser({ username: 'accrecip1', email: 'accrecip1@example.com' });

    const requestRepo = new FriendRequestRepository();
    const request = await requestRepo.create(sender._id.toString(), recipient._id.toString());

    const service = makeService();
    const result = await service.acceptRequest(recipient._id.toString(), request._id.toString());

    expect(result.friendId).toBe(sender._id.toString());
    expect(result.username).toBe('accsender1');
    expect(result.friendshipId).toBeTruthy();

    // Friendship should exist in DB
    const friendship = await FriendshipModel.findOne({
      $or: [
        { user1Id: sender._id, user2Id: recipient._id },
        { user1Id: recipient._id, user2Id: sender._id },
      ],
    }).exec();
    expect(friendship).not.toBeNull();
  });

  it('rejects if wrong recipient (FORBIDDEN)', async () => {
    const sender = await createTestUser({ username: 'accsender2', email: 'accsender2@example.com' });
    const recipient = await createTestUser({ username: 'accrecip2', email: 'accrecip2@example.com' });
    const intruder = await createTestUser({ username: 'intruder2', email: 'intruder2@example.com' });

    const requestRepo = new FriendRequestRepository();
    const request = await requestRepo.create(sender._id.toString(), recipient._id.toString());

    const service = makeService();
    await expect(
      service.acceptRequest(intruder._id.toString(), request._id.toString()),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects if request is not pending (REQUEST_NOT_PENDING)', async () => {
    const sender = await createTestUser({ username: 'accsender3', email: 'accsender3@example.com' });
    const recipient = await createTestUser({ username: 'accrecip3', email: 'accrecip3@example.com' });

    const requestRepo = new FriendRequestRepository();
    const request = await requestRepo.create(sender._id.toString(), recipient._id.toString());

    // Manually reject the request first
    await requestRepo.updateStatus(request._id.toString(), 'rejected', new Date());

    const service = makeService();
    await expect(
      service.acceptRequest(recipient._id.toString(), request._id.toString()),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REQUEST_NOT_PENDING' });
  });

  it('throws REQUEST_NOT_FOUND for a non-existent request ID', async () => {
    const user = await createTestUser({ username: 'accuser4', email: 'accuser4@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.acceptRequest(user._id.toString(), fakeId),
    ).rejects.toMatchObject({ statusCode: 404, code: 'REQUEST_NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// cancelRequest
// ---------------------------------------------------------------------------

describe('FriendsService.cancelRequest', () => {
  it('happy path cancels a pending request', async () => {
    const sender = await createTestUser({ username: 'cansender1', email: 'cansender1@example.com' });
    const recipient = await createTestUser({ username: 'canrecip1', email: 'canrecip1@example.com' });

    const requestRepo = new FriendRequestRepository();
    const request = await requestRepo.create(sender._id.toString(), recipient._id.toString());

    const service = makeService();
    await expect(
      service.cancelRequest(sender._id.toString(), request._id.toString()),
    ).resolves.toBeUndefined();

    const updated = await FriendRequestModel.findById(request._id).exec();
    expect(updated?.status).toBe('cancelled');
  });

  it('rejects if the wrong person (not sender) tries to cancel (FORBIDDEN)', async () => {
    const sender = await createTestUser({ username: 'cansender2', email: 'cansender2@example.com' });
    const recipient = await createTestUser({ username: 'canrecip2', email: 'canrecip2@example.com' });

    const requestRepo = new FriendRequestRepository();
    const request = await requestRepo.create(sender._id.toString(), recipient._id.toString());

    const service = makeService();
    await expect(
      service.cancelRequest(recipient._id.toString(), request._id.toString()),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects if request is not pending (REQUEST_NOT_PENDING)', async () => {
    const sender = await createTestUser({ username: 'cansender3', email: 'cansender3@example.com' });
    const recipient = await createTestUser({ username: 'canrecip3', email: 'canrecip3@example.com' });

    const requestRepo = new FriendRequestRepository();
    const request = await requestRepo.create(sender._id.toString(), recipient._id.toString());
    await requestRepo.updateStatus(request._id.toString(), 'accepted', new Date());

    const service = makeService();
    await expect(
      service.cancelRequest(sender._id.toString(), request._id.toString()),
    ).rejects.toMatchObject({ statusCode: 409, code: 'REQUEST_NOT_PENDING' });
  });

  it('throws REQUEST_NOT_FOUND for a non-existent request', async () => {
    const user = await createTestUser({ username: 'canuser4', email: 'canuser4@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.cancelRequest(user._id.toString(), fakeId),
    ).rejects.toMatchObject({ statusCode: 404, code: 'REQUEST_NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// removeFriend
// ---------------------------------------------------------------------------

describe('FriendsService.removeFriend', () => {
  it('removes an existing friendship', async () => {
    const user1 = await createTestUser({ username: 'remfriend1a', email: 'remfriend1a@example.com' });
    const user2 = await createTestUser({ username: 'remfriend1b', email: 'remfriend1b@example.com' });

    const friendshipRepo = new FriendshipRepository();
    await friendshipRepo.create(user1._id.toString(), user2._id.toString());

    const service = makeService();
    await expect(
      service.removeFriend(user1._id.toString(), user2._id.toString()),
    ).resolves.toBeUndefined();

    const friendship = await FriendshipModel.findOne({
      $or: [
        { user1Id: user1._id, user2Id: user2._id },
        { user1Id: user2._id, user2Id: user1._id },
      ],
    }).exec();
    expect(friendship).toBeNull();
  });

  it('throws NOT_FRIENDS when they are not friends', async () => {
    const user1 = await createTestUser({ username: 'remfriend2a', email: 'remfriend2a@example.com' });
    const user2 = await createTestUser({ username: 'remfriend2b', email: 'remfriend2b@example.com' });

    const service = makeService();
    await expect(
      service.removeFriend(user1._id.toString(), user2._id.toString()),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FRIENDS' });
  });
});
