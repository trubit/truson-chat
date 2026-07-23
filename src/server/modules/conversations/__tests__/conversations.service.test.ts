import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ConversationModel } from '../../../database/models/Conversation.js';
import { ConversationMemberModel } from '../../../database/models/ConversationMember.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import { ConversationRepository } from '../repository/index.js';
import { ConversationService } from '../service/index.js';

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
  await ConversationModel.deleteMany({});
  await ConversationMemberModel.deleteMany({});
  await BlockedUserModel.deleteMany({});
  await UserModel.deleteMany({});
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUser(suffix: string) {
  return UserModel.create({
    username: `user_${suffix}`,
    email: `user_${suffix}@example.com`,
    passwordHash: 'hash',
    role: 'user',
    status: 'active',
    emailVerified: true,
    phoneVerified: false,
  });
}

function makeService() {
  return new ConversationService(new ConversationRepository());
}

// ---------------------------------------------------------------------------
// getOrCreateDirect
// ---------------------------------------------------------------------------

describe('ConversationService.getOrCreateDirect', () => {
  it('creates a new direct conversation between two users', async () => {
    const alice = await createUser('alice1');
    const bob = await createUser('bob1');
    const svc = makeService();

    const result = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    expect(result._id).toBeTruthy();
    expect(result.type).toBe('direct');
    expect(result.participants).toHaveLength(2);
    expect(result.participants).toContain(alice._id.toString());
    expect(result.participants).toContain(bob._id.toString());
    expect(result.unreadCount).toBe(0);
    expect(result.myRole).toBe('owner');
  });

  it('is idempotent — second call returns the same conversation', async () => {
    const alice = await createUser('alice2');
    const bob = await createUser('bob2');
    const svc = makeService();

    const first = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    const second = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    expect(first._id).toBe(second._id);

    const count = await ConversationModel.countDocuments({ type: 'direct' });
    expect(count).toBe(1);
  });

  it('throws CANNOT_SELF_CONVERSE when userId === participantId', async () => {
    const alice = await createUser('alice3');
    const svc = makeService();

    await expect(
      svc.getOrCreateDirect(alice._id.toString(), alice._id.toString()),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANNOT_SELF_CONVERSE' });
  });

  it('throws INVALID_ID for a malformed participant ID', async () => {
    const alice = await createUser('alice4');
    const svc = makeService();

    await expect(svc.getOrCreateDirect(alice._id.toString(), 'not-an-id')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ID',
    });
  });

  it('throws BLOCKED when requester has blocked the other user', async () => {
    const alice = await createUser('alice5');
    const bob = await createUser('bob5');
    const svc = makeService();

    await BlockedUserModel.create({
      blockerId: alice._id,
      blockedId: bob._id,
    });

    await expect(
      svc.getOrCreateDirect(alice._id.toString(), bob._id.toString()),
    ).rejects.toMatchObject({ statusCode: 403, code: 'BLOCKED' });
  });

  it('throws BLOCKED when the other user has blocked the requester', async () => {
    const alice = await createUser('alice6');
    const bob = await createUser('bob6');
    const svc = makeService();

    await BlockedUserModel.create({
      blockerId: bob._id,
      blockedId: alice._id,
    });

    await expect(
      svc.getOrCreateDirect(alice._id.toString(), bob._id.toString()),
    ).rejects.toMatchObject({ statusCode: 403, code: 'BLOCKED' });
  });
});

// ---------------------------------------------------------------------------
// getConversation
// ---------------------------------------------------------------------------

describe('ConversationService.getConversation', () => {
  it('returns the conversation for a member', async () => {
    const alice = await createUser('alice7');
    const bob = await createUser('bob7');
    const svc = makeService();

    const created = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    const fetched = await svc.getConversation(alice._id.toString(), created._id);

    expect(fetched._id).toBe(created._id);
  });

  it('throws NOT_FOUND for a non-member', async () => {
    const alice = await createUser('alice8');
    const bob = await createUser('bob8');
    const charlie = await createUser('charlie8');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    await expect(svc.getConversation(charlie._id.toString(), conv._id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws INVALID_ID for a malformed conversation ID', async () => {
    const alice = await createUser('alice9');
    const svc = makeService();

    await expect(svc.getConversation(alice._id.toString(), 'bad-id')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ID',
    });
  });
});

// ---------------------------------------------------------------------------
// getConversations
// ---------------------------------------------------------------------------

describe('ConversationService.getConversations', () => {
  it('returns paginated conversations for a user', async () => {
    const alice = await createUser('alice10');
    const bob = await createUser('bob10');
    const carol = await createUser('carol10');
    const svc = makeService();

    await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    await svc.getOrCreateDirect(alice._id.toString(), carol._id.toString());

    const result = await svc.getConversations(alice._id.toString(), { page: 1, limit: 10 });

    expect(result.conversations).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('returns empty list for a user with no conversations', async () => {
    const alice = await createUser('alice11');
    const svc = makeService();

    const result = await svc.getConversations(alice._id.toString(), {});

    expect(result.conversations).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// archiveConversation / unarchiveConversation
// ---------------------------------------------------------------------------

describe('ConversationService.archiveConversation', () => {
  it('sets isArchived=true for the requesting member', async () => {
    const alice = await createUser('alice12');
    const bob = await createUser('bob12');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    await svc.archiveConversation(alice._id.toString(), conv._id);

    const member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isArchived).toBe(true);
  });

  it('unarchive sets isArchived=false', async () => {
    const alice = await createUser('alice13');
    const bob = await createUser('bob13');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    await svc.archiveConversation(alice._id.toString(), conv._id);
    await svc.unarchiveConversation(alice._id.toString(), conv._id);

    const member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isArchived).toBe(false);
  });

  it('throws NOT_FOUND when a non-member tries to archive', async () => {
    const alice = await createUser('alice14');
    const bob = await createUser('bob14');
    const charlie = await createUser('charlie14');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    await expect(svc.archiveConversation(charlie._id.toString(), conv._id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// pinConversation / unpinConversation
// ---------------------------------------------------------------------------

describe('ConversationService.pinConversation', () => {
  it('sets isPinned=true and then false', async () => {
    const alice = await createUser('alice15');
    const bob = await createUser('bob15');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    await svc.pinConversation(alice._id.toString(), conv._id);
    let member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isPinned).toBe(true);

    await svc.unpinConversation(alice._id.toString(), conv._id);
    member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isPinned).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// muteConversation / unmuteConversation
// ---------------------------------------------------------------------------

describe('ConversationService.muteConversation', () => {
  it('mutes indefinitely when no duration provided', async () => {
    const alice = await createUser('alice16');
    const bob = await createUser('bob16');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    await svc.muteConversation(alice._id.toString(), conv._id, {});

    const member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isMuted).toBe(true);
    expect(member?.muteUntil).toBeUndefined();
  });

  it('sets muteUntil when duration (minutes) is provided', async () => {
    const alice = await createUser('alice17');
    const bob = await createUser('bob17');
    const svc = makeService();
    const before = Date.now();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    await svc.muteConversation(alice._id.toString(), conv._id, { duration: 60 });

    const member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isMuted).toBe(true);
    expect(member?.muteUntil!.getTime()).toBeGreaterThan(before + 59 * 60 * 1000);
  });

  it('unmute clears isMuted and muteUntil', async () => {
    const alice = await createUser('alice18');
    const bob = await createUser('bob18');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    await svc.muteConversation(alice._id.toString(), conv._id, { duration: 60 });
    await svc.unmuteConversation(alice._id.toString(), conv._id);

    const member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.isMuted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// markRead
// ---------------------------------------------------------------------------

describe('ConversationService.markRead', () => {
  it('updates lastReadMessageId and resets unreadCount', async () => {
    const alice = await createUser('alice19');
    const bob = await createUser('bob19');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    // Artificially set unreadCount > 0 for alice
    await ConversationMemberModel.updateOne(
      { conversationId: new mongoose.Types.ObjectId(conv._id), userId: alice._id },
      { $set: { unreadCount: 5 } },
    );

    const fakeMessageId = new mongoose.Types.ObjectId().toString();
    await svc.markRead(alice._id.toString(), conv._id, fakeMessageId);

    const member = await ConversationMemberModel.findOne({
      conversationId: new mongoose.Types.ObjectId(conv._id),
      userId: alice._id,
    });
    expect(member?.unreadCount).toBe(0);
    expect(member?.lastReadMessageId?.toString()).toBe(fakeMessageId);
  });

  it('throws INVALID_ID for a malformed messageId', async () => {
    const alice = await createUser('alice20');
    const bob = await createUser('bob20');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());

    await expect(svc.markRead(alice._id.toString(), conv._id, 'bad-id')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ID',
    });
  });
});

// ---------------------------------------------------------------------------
// getMembers
// ---------------------------------------------------------------------------

describe('ConversationService.getMembers', () => {
  it('returns both members of a direct conversation', async () => {
    const alice = await createUser('alice21');
    const bob = await createUser('bob21');
    const svc = makeService();

    const conv = await svc.getOrCreateDirect(alice._id.toString(), bob._id.toString());
    const members = await svc.getMembers(alice._id.toString(), conv._id);

    expect(members).toHaveLength(2);
    const userIds = members.map((m) => m.userId.toString());
    expect(userIds).toContain(alice._id.toString());
    expect(userIds).toContain(bob._id.toString());
  });
});
