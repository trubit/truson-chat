import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ConversationModel } from '../../../database/models/Conversation.js';
import { ConversationMemberModel } from '../../../database/models/ConversationMember.js';
import { MessageModel } from '../../../database/models/Message.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import { MessageRepository } from '../repository/index.js';
import { ConversationRepository } from '../../conversations/repository/index.js';
import { MessageService } from '../service/index.js';

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
  await MessageModel.deleteMany({});
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

async function createConversation(userId1: string, userId2: string) {
  const convRepo = new ConversationRepository();
  return convRepo.createDirect(userId1, userId2);
}

function makeService() {
  return new MessageService(new MessageRepository(), new ConversationRepository());
}

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe('MessageService.sendMessage', () => {
  it('creates a message and returns a response', async () => {
    const alice = await createUser('alice1');
    const bob   = await createUser('bob1');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const result = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Hello Bob!',
    });

    expect(result._id).toBeTruthy();
    expect(result.content).toBe('Hello Bob!');
    expect(result.senderId).toBe(alice._id.toString());
    expect(result.conversationId).toBe(conv._id.toString());
    expect(result.status).toBe('sent');
  });

  it('updates conversation lastMessage snapshot after send', async () => {
    const alice = await createUser('alice2');
    const bob   = await createUser('bob2');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Snapshot test',
    });

    const updated = await ConversationModel.findById(conv._id);
    expect(updated?.lastMessage?.content).toBe('Snapshot test');
    expect(updated?.lastMessage?.senderId.toString()).toBe(alice._id.toString());
  });

  it('increments unread for the other member', async () => {
    const alice = await createUser('alice3');
    const bob   = await createUser('bob3');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Hey',
    });

    const bobMember = await ConversationMemberModel.findOne({
      conversationId: conv._id,
      userId: bob._id,
    });
    expect(bobMember?.unreadCount).toBe(1);
  });

  it('throws NOT_FOUND when user is not a member', async () => {
    const alice   = await createUser('alice4');
    const bob     = await createUser('bob4');
    const charlie = await createUser('charlie4');
    const conv    = await createConversation(alice._id.toString(), bob._id.toString());
    const svc     = makeService();

    await expect(
      svc.sendMessage(charlie._id.toString(), {
        conversationId: conv._id.toString(),
        type: 'text',
        content: 'Intruder!',
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('throws BLOCKED when block exists in either direction', async () => {
    const alice = await createUser('alice5');
    const bob   = await createUser('bob5');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    await BlockedUserModel.create({ blockerId: bob._id, blockedId: alice._id });

    await expect(
      svc.sendMessage(alice._id.toString(), {
        conversationId: conv._id.toString(),
        type: 'text',
        content: 'Blocked',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'BLOCKED' });
  });

  it('throws INVALID_ID for a malformed conversation ID', async () => {
    const alice = await createUser('alice6');
    const svc   = makeService();

    await expect(
      svc.sendMessage(alice._id.toString(), {
        conversationId: 'bad-id',
        type: 'text',
        content: 'Hello',
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ID' });
  });

  it('stores replyTo when provided', async () => {
    const alice = await createUser('alice7');
    const bob   = await createUser('bob7');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const original = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Original',
    });

    const reply = await svc.sendMessage(bob._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Reply!',
      replyTo: original._id,
    });

    expect(reply.replyTo).toBe(original._id);
  });
});

// ---------------------------------------------------------------------------
// editMessage
// ---------------------------------------------------------------------------

describe('MessageService.editMessage', () => {
  it('edits message content and saves old content to editHistory', async () => {
    const alice = await createUser('alice8');
    const bob   = await createUser('bob8');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Original text',
    });

    const edited = await svc.editMessage(alice._id.toString(), msg._id, { content: 'Edited text' });

    expect(edited.content).toBe('Edited text');
    expect(edited.isEdited).toBe(true);
    expect(edited.editedAt).toBeTruthy();

    const stored = await MessageModel.findById(msg._id);
    expect(stored?.editHistory).toHaveLength(1);
    expect(stored?.editHistory[0].content).toBe('Original text');
  });

  it('throws FORBIDDEN when non-sender tries to edit', async () => {
    const alice = await createUser('alice9');
    const bob   = await createUser('bob9');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Alice wrote this',
    });

    await expect(
      svc.editMessage(bob._id.toString(), msg._id, { content: 'Bob edited it' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws MESSAGE_DELETED when editing a deleted message', async () => {
    const alice = await createUser('alice10');
    const bob   = await createUser('bob10');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Will be deleted',
    });
    await svc.deleteMessage(alice._id.toString(), msg._id);

    await expect(
      svc.editMessage(alice._id.toString(), msg._id, { content: 'Too late' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'MESSAGE_DELETED' });
  });

  it('throws NOT_FOUND for a non-existent message', async () => {
    const alice = await createUser('alice11');
    const svc   = makeService();
    const fakeId = new mongoose.Types.ObjectId().toString();

    await expect(
      svc.editMessage(alice._id.toString(), fakeId, { content: 'Ghost' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// deleteMessage
// ---------------------------------------------------------------------------

describe('MessageService.deleteMessage', () => {
  it('soft-deletes a message — content is redacted in response', async () => {
    const alice = await createUser('alice12');
    const bob   = await createUser('bob12');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Delete me',
    });

    const result = await svc.deleteMessage(alice._id.toString(), msg._id);

    expect(result.deletedAt).toBeTruthy();
    expect(result.content).toBe('');

    const stored = await MessageModel.findById(msg._id);
    expect(stored?.deletedAt).toBeTruthy();
  });

  it('throws FORBIDDEN when non-sender tries to delete', async () => {
    const alice = await createUser('alice13');
    const bob   = await createUser('bob13');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Alice only',
    });

    await expect(
      svc.deleteMessage(bob._id.toString(), msg._id),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('throws ALREADY_DELETED on a second delete attempt', async () => {
    const alice = await createUser('alice14');
    const bob   = await createUser('bob14');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'One delete only',
    });
    await svc.deleteMessage(alice._id.toString(), msg._id);

    await expect(
      svc.deleteMessage(alice._id.toString(), msg._id),
    ).rejects.toMatchObject({ statusCode: 400, code: 'ALREADY_DELETED' });
  });
});

// ---------------------------------------------------------------------------
// toggleReaction
// ---------------------------------------------------------------------------

describe('MessageService.toggleReaction', () => {
  it('adds a reaction when user has not reacted yet', async () => {
    const alice = await createUser('alice15');
    const bob   = await createUser('bob15');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'React to me',
    });

    const result = await svc.toggleReaction(bob._id.toString(), msg._id, { emoji: '👍' });

    expect(result.action).toBe('add');
    expect(result.emoji).toBe('👍');
    const reaction = result.reactions.find((r) => r.emoji === '👍');
    expect(reaction?.count).toBe(1);
    expect(reaction?.users).toContain(bob._id.toString());
  });

  it('removes a reaction when user already reacted with same emoji', async () => {
    const alice = await createUser('alice16');
    const bob   = await createUser('bob16');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Toggle test',
    });

    await svc.toggleReaction(bob._id.toString(), msg._id, { emoji: '❤️' });
    const result = await svc.toggleReaction(bob._id.toString(), msg._id, { emoji: '❤️' });

    expect(result.action).toBe('remove');
    const reaction = result.reactions.find((r) => r.emoji === '❤️');
    expect(reaction).toBeUndefined();
  });

  it('multiple users can react with the same emoji', async () => {
    const alice = await createUser('alice17');
    const bob   = await createUser('bob17');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Multi react',
    });

    await svc.toggleReaction(alice._id.toString(), msg._id, { emoji: '🔥' });
    const result = await svc.toggleReaction(bob._id.toString(), msg._id, { emoji: '🔥' });

    const reaction = result.reactions.find((r) => r.emoji === '🔥');
    expect(reaction?.count).toBe(2);
    expect(reaction?.users).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getMessages
// ---------------------------------------------------------------------------

describe('MessageService.getMessages', () => {
  it('returns messages newest-first from the DB with hasMore flag', async () => {
    const alice = await createUser('alice18');
    const bob   = await createUser('bob18');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    for (let i = 0; i < 5; i++) {
      await svc.sendMessage(alice._id.toString(), {
        conversationId: conv._id.toString(),
        type: 'text',
        content: `Message ${i}`,
      });
    }

    const result = await svc.getMessages(alice._id.toString(), conv._id.toString(), {
      conversationId: conv._id.toString(),
      limit: 3,
    });

    expect(result.messages).toHaveLength(3);
    expect(result.hasMore).toBe(true);
  });

  it('returns hasMore=false when all messages fit in the page', async () => {
    const alice = await createUser('alice19');
    const bob   = await createUser('bob19');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Only message',
    });

    const result = await svc.getMessages(alice._id.toString(), conv._id.toString(), {
      conversationId: conv._id.toString(),
      limit: 30,
    });

    expect(result.messages).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });

  it('throws NOT_FOUND for non-members', async () => {
    const alice   = await createUser('alice20');
    const bob     = await createUser('bob20');
    const charlie = await createUser('charlie20');
    const conv    = await createConversation(alice._id.toString(), bob._id.toString());
    const svc     = makeService();

    await expect(
      svc.getMessages(charlie._id.toString(), conv._id.toString(), {
        conversationId: conv._id.toString(),
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// markRead / markDelivered
// ---------------------------------------------------------------------------

describe('MessageService.markRead', () => {
  it('resets unread count for the conversation member', async () => {
    const alice = await createUser('alice21');
    const bob   = await createUser('bob21');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    // Alice sends a message — increments bob's unread
    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Read this',
    });

    // Bob marks it read
    await svc.markRead(bob._id.toString(), conv._id.toString(), msg._id);

    const bobMember = await ConversationMemberModel.findOne({
      conversationId: conv._id,
      userId: bob._id,
    });
    expect(bobMember?.unreadCount).toBe(0);
    expect(bobMember?.lastReadMessageId?.toString()).toBe(msg._id);
  });
});

describe('MessageService.markDelivered', () => {
  it('marks messages as delivered without throwing', async () => {
    const alice = await createUser('alice22');
    const bob   = await createUser('bob22');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Deliver me',
    });

    await expect(
      svc.markDelivered(bob._id.toString(), conv._id.toString()),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getMessage
// ---------------------------------------------------------------------------

describe('MessageService.getMessage', () => {
  it('returns a single message for a member', async () => {
    const alice = await createUser('alice23');
    const bob   = await createUser('bob23');
    const conv  = await createConversation(alice._id.toString(), bob._id.toString());
    const svc   = makeService();

    const sent = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Fetch me',
    });

    const fetched = await svc.getMessage(bob._id.toString(), sent._id);
    expect(fetched._id).toBe(sent._id);
    expect(fetched.content).toBe('Fetch me');
  });

  it('throws NOT_FOUND for a non-member', async () => {
    const alice   = await createUser('alice24');
    const bob     = await createUser('bob24');
    const charlie = await createUser('charlie24');
    const conv    = await createConversation(alice._id.toString(), bob._id.toString());
    const svc     = makeService();

    const msg = await svc.sendMessage(alice._id.toString(), {
      conversationId: conv._id.toString(),
      type: 'text',
      content: 'Secret',
    });

    await expect(
      svc.getMessage(charlie._id.toString(), msg._id),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
