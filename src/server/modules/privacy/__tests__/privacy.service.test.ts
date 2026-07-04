import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PrivacySettingModel } from '../../../database/models/PrivacySetting.js';
import { FriendshipModel } from '../../../database/models/Friendship.js';
import { ContactModel } from '../../../database/models/Contact.js';
import { PrivacyRepository } from '../repository/index.js';
import { PrivacyService } from '../service/index.js';

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
  await PrivacySettingModel.deleteMany({});
  await FriendshipModel.deleteMany({});
  await ContactModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeService() {
  const repo = new PrivacyRepository();
  return new PrivacyService(repo);
}

function newId(): string {
  return new mongoose.Types.ObjectId().toString();
}

// ---------------------------------------------------------------------------
// getSettings
// ---------------------------------------------------------------------------

describe('PrivacyService.getSettings', () => {
  it('returns default settings when no DB record exists', async () => {
    const userId = newId();
    const service = makeService();

    const result = await service.getSettings(userId);

    expect(result.userId).toBe(userId);
    expect(result.profileVisibility).toBe('everyone');
    expect(result.discoverable).toBe(true);
    expect(result.allowContactFromEveryone).toBe(true);
    expect(result.phoneVisibility).toBe('nobody');
    expect(result.emailVisibility).toBe('nobody');
  });

  it('returns existing settings from the DB', async () => {
    const userId = new mongoose.Types.ObjectId();
    await PrivacySettingModel.create({
      userId,
      profileVisibility: 'friends',
      discoverable: false,
    });

    const service = makeService();
    const result = await service.getSettings(userId.toString());

    expect(result.profileVisibility).toBe('friends');
    expect(result.discoverable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateSettings
// ---------------------------------------------------------------------------

describe('PrivacyService.updateSettings', () => {
  it('upserts new settings and returns updated data', async () => {
    const userId = newId();
    const service = makeService();

    const result = await service.updateSettings(userId, {
      profileVisibility: 'contacts',
      discoverable: false,
    });

    expect(result.profileVisibility).toBe('contacts');
    expect(result.discoverable).toBe(false);
  });

  it('merges partial updates with existing settings', async () => {
    const userId = newId();
    const service = makeService();

    await service.updateSettings(userId, { profileVisibility: 'friends', discoverable: false });
    const result = await service.updateSettings(userId, { profileVisibility: 'everyone' });

    expect(result.profileVisibility).toBe('everyone');
    // discoverable was not changed — check DB retains it
    const dbDoc = await PrivacySettingModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();
    expect(dbDoc?.discoverable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkPrivacy
// ---------------------------------------------------------------------------

describe('PrivacyService.checkPrivacy', () => {
  it('returns all-true when requester is the same user (self)', async () => {
    const userId = newId();
    const service = makeService();

    const result = await service.checkPrivacy(userId, userId);

    expect(result).toMatchObject({
      canViewProfile: true,
      canViewPhone: true,
      canViewEmail: true,
      canViewLastSeen: true,
      canViewOnlineStatus: true,
      canSendFriendRequest: true,
      canFindInSearch: true,
      canAddContact: true,
    });
  });

  it('applies "everyone" visibility — allows stranger access', async () => {
    const requesterId = newId();
    const targetId = newId();
    const service = makeService();

    // Target has default settings (everything "everyone")
    const result = await service.checkPrivacy(requesterId, targetId);

    expect(result.canViewProfile).toBe(true);
    expect(result.canSendFriendRequest).toBe(true);
    expect(result.canFindInSearch).toBe(true);
    expect(result.canAddContact).toBe(true);
  });

  it('denies profile access for stranger when profileVisibility is "friends"', async () => {
    const requesterId = newId();
    const targetId = newId();

    await PrivacySettingModel.create({
      userId: new mongoose.Types.ObjectId(targetId),
      profileVisibility: 'friends',
    });

    const service = makeService();
    const result = await service.checkPrivacy(requesterId, targetId);

    expect(result.canViewProfile).toBe(false);
  });

  it('allows profile access for a friend when profileVisibility is "friends"', async () => {
    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();

    const [lesser, greater] = [userId1.toString(), userId2.toString()].sort();

    await FriendshipModel.create({
      user1Id: new mongoose.Types.ObjectId(lesser as string),
      user2Id: new mongoose.Types.ObjectId(greater as string),
    });

    await PrivacySettingModel.create({
      userId: userId2,
      profileVisibility: 'friends',
    });

    const service = makeService();
    const result = await service.checkPrivacy(userId1.toString(), userId2.toString());

    expect(result.canViewProfile).toBe(true);
  });

  it('allows profile access for a contact when profileVisibility is "contacts"', async () => {
    const requesterId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();

    await ContactModel.create({
      ownerId: requesterId,
      contactUserId: targetId,
      category: 'general',
      labels: [],
      isFavorite: false,
      addedVia: 'manual',
    });

    await PrivacySettingModel.create({
      userId: targetId,
      profileVisibility: 'contacts',
    });

    const service = makeService();
    const result = await service.checkPrivacy(requesterId.toString(), targetId.toString());

    expect(result.canViewProfile).toBe(true);
  });

  it('denies everything when profileVisibility is "nobody"', async () => {
    const requesterId = newId();
    const targetId = newId();

    await PrivacySettingModel.create({
      userId: new mongoose.Types.ObjectId(targetId),
      profileVisibility: 'nobody',
    });

    const service = makeService();
    const result = await service.checkPrivacy(requesterId, targetId);

    expect(result.canViewProfile).toBe(false);
  });

  it('canFindInSearch is false when discoverable is false', async () => {
    const requesterId = newId();
    const targetId = newId();

    await PrivacySettingModel.create({
      userId: new mongoose.Types.ObjectId(targetId),
      discoverable: false,
    });

    const service = makeService();
    const result = await service.checkPrivacy(requesterId, targetId);

    expect(result.canFindInSearch).toBe(false);
  });

  it('throws INVALID_ID for a malformed targetId', async () => {
    const requesterId = newId();
    const service = makeService();

    await expect(
      service.checkPrivacy(requesterId, 'not-an-id'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ID' });
  });
});
