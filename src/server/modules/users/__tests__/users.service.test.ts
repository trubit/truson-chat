import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { AuditLogModel } from '../../../database/models/AuditLog.js';
import { UsersRepository } from '../repository/index.js';
import { UsersService } from '../service/index.js';

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
  await AuditLogModel.deleteMany({});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestUser(overrides: Partial<{
  username: string;
  email: string;
  role: 'user' | 'admin' | 'business';
  status: 'active' | 'suspended' | 'deleted' | 'pending_verification';
}> = {}) {
  const user = await UserModel.create({
    username: overrides.username ?? 'testuser',
    email: overrides.email ?? 'test@example.com',
    passwordHash: 'hashed_password',
    role: overrides.role ?? 'user',
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
  const repo = new UsersRepository();
  return new UsersService(repo);
}

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------

describe('UsersService.getUserById', () => {
  it('returns PublicUserProfile for a regular user requester', async () => {
    const admin = await createTestUser({ username: 'admin1', email: 'admin@example.com', role: 'admin' });
    const target = await createTestUser({ username: 'target1', email: 'target@example.com' });

    const service = makeService();
    const result = await service.getUserById(
      admin._id.toString(),
      'user', // requester is a regular user
      target._id.toString(),
    );

    expect(result).toHaveProperty('username', 'target1');
    expect(result).toHaveProperty('displayName');
    // Regular users should NOT see email
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('loginAttempts');
  });

  it('returns AdminUserView for an admin requester', async () => {
    const admin = await createTestUser({ username: 'admin2', email: 'admin2@example.com', role: 'admin' });
    const target = await createTestUser({ username: 'target2', email: 'target2@example.com' });

    const service = makeService();
    const result = await service.getUserById(
      admin._id.toString(),
      'admin',
      target._id.toString(),
    );

    expect(result).toHaveProperty('username', 'target2');
    expect(result).toHaveProperty('email', 'target2@example.com');
    expect(result).toHaveProperty('emailVerified');
    expect(result).toHaveProperty('loginAttempts');
    expect(result).toHaveProperty('createdAt');
  });

  it('throws 404 for a deleted user', async () => {
    const admin = await createTestUser({ username: 'admin3', email: 'admin3@example.com', role: 'admin' });
    const deleted = await createTestUser({
      username: 'deleted1',
      email: 'deleted@example.com',
      status: 'deleted',
    });

    const service = makeService();
    await expect(
      service.getUserById(admin._id.toString(), 'admin', deleted._id.toString()),
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });

  it('throws 404 for a non-existent user ID', async () => {
    const requester = await createTestUser({ username: 'req1', email: 'req1@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();

    const service = makeService();
    await expect(
      service.getUserById(requester._id.toString(), 'user', fakeId),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------

describe('UsersService.listUsers', () => {
  it('returns paginated results with correct meta for admin', async () => {
    const admin = await createTestUser({ username: 'adminlist', email: 'adminlist@example.com', role: 'admin' });
    await createTestUser({ username: 'user1', email: 'user1@example.com' });
    await createTestUser({ username: 'user2', email: 'user2@example.com' });

    const service = makeService();
    const result = await service.listUsers(admin._id.toString(), 'admin', {
      page: 1,
      limit: 10,
    });

    expect(result.users.length).toBeGreaterThanOrEqual(3); // admin + 2 users
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      hasMore: expect.any(Boolean),
    });
    // All results should be AdminUserView (have email field)
    result.users.forEach((u) => {
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('emailVerified');
    });
  });

  it('returns first page results with hasMore=true when there are more results', async () => {
    const admin = await createTestUser({ username: 'adminpag', email: 'adminpag@example.com', role: 'admin' });
    for (let i = 0; i < 5; i++) {
      await createTestUser({ username: `pageuser${i}`, email: `pageuser${i}@example.com` });
    }

    const service = makeService();
    const result = await service.listUsers(admin._id.toString(), 'admin', {
      page: 1,
      limit: 3,
    });

    expect(result.users.length).toBe(3);
    expect(result.meta.hasMore).toBe(true);
  });

  it('throws 403 for non-admin requester', async () => {
    const user = await createTestUser({ username: 'regularuser', email: 'regular@example.com' });

    const service = makeService();
    await expect(
      service.listUsers(user._id.toString(), 'user', { page: 1, limit: 10 }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe('UsersService.updateUser', () => {
  it('allows a user to update their own username', async () => {
    const user = await createTestUser({ username: 'myuser', email: 'myuser@example.com' });

    const service = makeService();
    const result = await service.updateUser(
      user._id.toString(),
      'user',
      user._id.toString(),
      { username: 'mynewuser' },
      '127.0.0.1',
      'Test/1.0',
    );

    expect(result.username).toBe('mynewuser');
  });

  it('throws 403 when a non-admin tries to update another user', async () => {
    const user1 = await createTestUser({ username: 'usr1', email: 'usr1@example.com' });
    const user2 = await createTestUser({ username: 'usr2', email: 'usr2@example.com' });

    const service = makeService();
    await expect(
      service.updateUser(
        user1._id.toString(),
        'user',
        user2._id.toString(),
        { username: 'hacked' },
        '127.0.0.1',
        'Test/1.0',
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('allows an admin to update any user', async () => {
    const admin = await createTestUser({ username: 'adminupd', email: 'adminupd@example.com', role: 'admin' });
    const target = await createTestUser({ username: 'targetupd', email: 'targetupd@example.com' });

    const service = makeService();
    const result = await service.updateUser(
      admin._id.toString(),
      'admin',
      target._id.toString(),
      { username: 'updatedbyAdmin' },
      '127.0.0.1',
      'Test/1.0',
    );

    expect(result.username).toBe('updatedbyAdmin');
  });

  it('creates an audit log entry on update', async () => {
    const user = await createTestUser({ username: 'audituser', email: 'audit@example.com' });

    const service = makeService();
    await service.updateUser(
      user._id.toString(),
      'user',
      user._id.toString(),
      { username: 'auditupdated' },
      '10.0.0.1',
      'AuditTest/1.0',
    );

    const logs = await AuditLogModel.find({ userId: user._id }).exec();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.action).toBe('user.update');
  });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------

describe('UsersService.deleteUser', () => {
  it('soft-deletes own account', async () => {
    const user = await createTestUser({ username: 'delme', email: 'delme@example.com' });

    const service = makeService();
    await service.deleteUser(
      user._id.toString(),
      'user',
      user._id.toString(),
      '127.0.0.1',
      'Test/1.0',
    );

    const updated = await UserModel.findById(user._id).exec();
    expect(updated?.status).toBe('deleted');
    expect(updated?.deletedAt).toBeDefined();
  });

  it('throws 403 when a non-admin tries to delete another user', async () => {
    const user1 = await createTestUser({ username: 'del1', email: 'del1@example.com' });
    const user2 = await createTestUser({ username: 'del2', email: 'del2@example.com' });

    const service = makeService();
    await expect(
      service.deleteUser(
        user1._id.toString(),
        'user',
        user2._id.toString(),
        '127.0.0.1',
        'Test/1.0',
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('allows an admin to delete any user', async () => {
    const admin = await createTestUser({ username: 'admindelete', email: 'admindelete@example.com', role: 'admin' });
    const target = await createTestUser({ username: 'victimuser', email: 'victim@example.com' });

    const service = makeService();
    await expect(
      service.deleteUser(
        admin._id.toString(),
        'admin',
        target._id.toString(),
        '127.0.0.1',
        'Test/1.0',
      ),
    ).resolves.toBeUndefined();

    const updated = await UserModel.findById(target._id).exec();
    expect(updated?.status).toBe('deleted');
  });
});

// ---------------------------------------------------------------------------
// updateUserStatus
// ---------------------------------------------------------------------------

describe('UsersService.updateUserStatus', () => {
  it('changes user status and creates audit log', async () => {
    const admin = await createTestUser({ username: 'adminstat', email: 'adminstat@example.com', role: 'admin' });
    const target = await createTestUser({ username: 'targetstat', email: 'targetstat@example.com' });

    const service = makeService();
    const result = await service.updateUserStatus(
      admin._id.toString(),
      target._id.toString(),
      { status: 'suspended', reason: 'Violation of terms' },
      '127.0.0.1',
      'Test/1.0',
    );

    expect(result.status).toBe('suspended');

    const logs = await AuditLogModel.find({ userId: admin._id }).exec();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.action).toBe('user.status_change');
  });

  it('throws 404 for a non-existent target user', async () => {
    const admin = await createTestUser({ username: 'adminstat2', email: 'adminstat2@example.com', role: 'admin' });
    const fakeId = new mongoose.Types.ObjectId().toString();

    const service = makeService();
    await expect(
      service.updateUserStatus(
        admin._id.toString(),
        fakeId,
        { status: 'suspended' },
        '127.0.0.1',
        'Test/1.0',
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });
});
