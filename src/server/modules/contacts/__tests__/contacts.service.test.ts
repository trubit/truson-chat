import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import { ContactModel } from '../../../database/models/Contact.js';
import { ContactRepository } from '../repository/index.js';
import { ContactsService } from '../service/index.js';

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
  await ContactModel.deleteMany({});
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
  const repo = new ContactRepository();
  return new ContactsService(repo);
}

// ---------------------------------------------------------------------------
// addContact
// ---------------------------------------------------------------------------

describe('ContactsService.addContact', () => {
  it('happy path creates a contact and returns populated data', async () => {
    const owner = await createTestUser({ username: 'owner1', email: 'owner1@example.com' });
    const target = await createTestUser({ username: 'target1', email: 'target1@example.com' });

    const service = makeService();
    const result = await service.addContact(owner._id.toString(), {
      userId: target._id.toString(),
    });

    expect(result.contactUserId).toBe(target._id.toString());
    expect(result.username).toBe('target1');
    expect(result.isFavorite).toBe(false);
    expect(result.addedVia).toBe('manual');
  });

  it('rejects self-add with CANNOT_ADD_SELF', async () => {
    const user = await createTestUser({ username: 'self1', email: 'self1@example.com' });
    const service = makeService();

    await expect(
      service.addContact(user._id.toString(), { userId: user._id.toString() }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'CANNOT_ADD_SELF' });
  });

  it('rejects duplicate contact with CONTACT_ALREADY_EXISTS', async () => {
    const owner = await createTestUser({ username: 'owner2', email: 'owner2@example.com' });
    const target = await createTestUser({ username: 'target2', email: 'target2@example.com' });

    const service = makeService();
    await service.addContact(owner._id.toString(), { userId: target._id.toString() });

    await expect(
      service.addContact(owner._id.toString(), { userId: target._id.toString() }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONTACT_ALREADY_EXISTS' });
  });

  it('rejects adding a non-existent user with USER_NOT_FOUND', async () => {
    const owner = await createTestUser({ username: 'owner3', email: 'owner3@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(
      service.addContact(owner._id.toString(), { userId: fakeId }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'USER_NOT_FOUND' });
  });

  it('rejects an invalid userId with INVALID_USER_ID', async () => {
    const owner = await createTestUser({ username: 'owner4', email: 'owner4@example.com' });
    const service = makeService();

    await expect(
      service.addContact(owner._id.toString(), { userId: 'not-an-id' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_USER_ID' });
  });
});

// ---------------------------------------------------------------------------
// toggleFavorite
// ---------------------------------------------------------------------------

describe('ContactsService.toggleFavorite', () => {
  it('flips isFavorite from false to true', async () => {
    const owner = await createTestUser({ username: 'favowner1', email: 'favowner1@example.com' });
    const target = await createTestUser({
      username: 'favtarget1',
      email: 'favtarget1@example.com',
    });

    const service = makeService();
    const contact = await service.addContact(owner._id.toString(), {
      userId: target._id.toString(),
    });

    const result = await service.toggleFavorite(owner._id.toString(), contact.id);
    expect(result.isFavorite).toBe(true);
  });

  it('flips isFavorite from true back to false', async () => {
    const owner = await createTestUser({ username: 'favowner2', email: 'favowner2@example.com' });
    const target = await createTestUser({
      username: 'favtarget2',
      email: 'favtarget2@example.com',
    });

    const service = makeService();
    const contact = await service.addContact(owner._id.toString(), {
      userId: target._id.toString(),
    });

    await service.toggleFavorite(owner._id.toString(), contact.id);
    const result = await service.toggleFavorite(owner._id.toString(), contact.id);
    expect(result.isFavorite).toBe(false);
  });

  it('throws FORBIDDEN when a different user attempts toggle', async () => {
    const owner = await createTestUser({ username: 'favowner3', email: 'favowner3@example.com' });
    const other = await createTestUser({ username: 'other1', email: 'other1@example.com' });
    const target = await createTestUser({
      username: 'favtarget3',
      email: 'favtarget3@example.com',
    });

    const service = makeService();
    const contact = await service.addContact(owner._id.toString(), {
      userId: target._id.toString(),
    });

    await expect(service.toggleFavorite(other._id.toString(), contact.id)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('throws CONTACT_NOT_FOUND for a missing contact', async () => {
    const user = await createTestUser({ username: 'favowner4', email: 'favowner4@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(service.toggleFavorite(user._id.toString(), fakeId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'CONTACT_NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------------------
// removeContact
// ---------------------------------------------------------------------------

describe('ContactsService.removeContact', () => {
  it('removes a contact that belongs to the requester', async () => {
    const owner = await createTestUser({ username: 'remowner1', email: 'remowner1@example.com' });
    const target = await createTestUser({
      username: 'remtarget1',
      email: 'remtarget1@example.com',
    });

    const service = makeService();
    const contact = await service.addContact(owner._id.toString(), {
      userId: target._id.toString(),
    });

    await expect(service.removeContact(owner._id.toString(), contact.id)).resolves.toBeUndefined();

    const found = await ContactModel.findById(contact.id).exec();
    expect(found).toBeNull();
  });

  it('throws FORBIDDEN when a different user tries to remove', async () => {
    const owner = await createTestUser({ username: 'remowner2', email: 'remowner2@example.com' });
    const intruder = await createTestUser({
      username: 'intruder1',
      email: 'intruder1@example.com',
    });
    const target = await createTestUser({
      username: 'remtarget2',
      email: 'remtarget2@example.com',
    });

    const service = makeService();
    const contact = await service.addContact(owner._id.toString(), {
      userId: target._id.toString(),
    });

    await expect(service.removeContact(intruder._id.toString(), contact.id)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('throws CONTACT_NOT_FOUND for a non-existent ID', async () => {
    const owner = await createTestUser({ username: 'remowner3', email: 'remowner3@example.com' });
    const fakeId = new mongoose.Types.ObjectId().toString();
    const service = makeService();

    await expect(service.removeContact(owner._id.toString(), fakeId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'CONTACT_NOT_FOUND',
    });
  });
});
