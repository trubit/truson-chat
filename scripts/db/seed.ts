/**
 * Database seed script — idempotent, safe to run repeatedly.
 *
 * Usage:
 *   npm run db:seed
 *   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=Admin@123! tsx scripts/db/seed.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Config ────────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? 'truson_chat';
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@truson-chat.example.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456!';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI environment variable is required.');
  process.exit(1);
}

// ── Schemas ───────────────────────────────────────────────────────────────────
// Inline lightweight schemas so the seed script has no dependency on the full
// server model layer (which may not be compiled yet during first setup).

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'business'], default: 'user' },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted', 'pending_verification'],
      default: 'active',
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const conversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group', 'channel'], default: 'direct' },
    name: { type: String },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
    content: { type: String, required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

// ── Models ────────────────────────────────────────────────────────────────────

const User = mongoose.models['User'] ?? mongoose.model('User', userSchema);
const Conversation =
  mongoose.models['Conversation'] ?? mongoose.model('Conversation', conversationSchema);
const Message = mongoose.models['Message'] ?? mongoose.model('Message', messageSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string): void {
  console.log(`[seed] ${msg}`);
}

// ── Seed functions ────────────────────────────────────────────────────────────

async function seedAdminUser(): Promise<mongoose.Types.ObjectId> {
  const existing = await User.findOne({ email: SEED_ADMIN_EMAIL }).lean();

  if (existing) {
    log(`Admin user already exists — skipping (${SEED_ADMIN_EMAIL})`);
    return existing._id as mongoose.Types.ObjectId;
  }

  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS);

  const admin = await User.create({
    username: 'admin',
    email: SEED_ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    status: 'active',
    emailVerified: true,
  });

  log(`Created admin user: ${SEED_ADMIN_EMAIL}`);
  return admin._id as mongoose.Types.ObjectId;
}

async function seedTestUser(): Promise<mongoose.Types.ObjectId> {
  const email = 'testuser@truson-chat.example.com';
  const existing = await User.findOne({ email }).lean();

  if (existing) {
    log(`Test user already exists — skipping (${email})`);
    return existing._id as mongoose.Types.ObjectId;
  }

  const passwordHash = await bcrypt.hash('TestUser@123!', BCRYPT_ROUNDS);

  const testUser = await User.create({
    username: 'testuser',
    email,
    passwordHash,
    role: 'user',
    status: 'active',
    emailVerified: true,
  });

  log(`Created test user: ${email}`);
  return testUser._id as mongoose.Types.ObjectId;
}

async function seedConversations(
  adminId: mongoose.Types.ObjectId,
  testUserId: mongoose.Types.ObjectId,
): Promise<void> {
  const existingCount = await Conversation.countDocuments({
    participants: { $all: [adminId, testUserId] },
    type: 'direct',
  });

  if (existingCount > 0) {
    log('Seed conversation already exists — skipping');
    return;
  }

  const conversation = await Conversation.create({
    type: 'direct',
    participants: [adminId, testUserId],
    createdBy: adminId,
    lastMessageAt: new Date(),
  });

  await Message.create([
    {
      conversationId: conversation._id,
      senderId: adminId,
      type: 'text',
      content: 'Welcome to Truson-Chat! This is the admin seed message.',
      readBy: [adminId],
    },
    {
      conversationId: conversation._id,
      senderId: testUserId,
      type: 'text',
      content: 'Thanks! Happy to be here.',
      readBy: [testUserId],
    },
  ]);

  log(`Created seed conversation with 2 messages (id: ${String(conversation._id)})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log(`Connecting to MongoDB (db: ${MONGODB_DB_NAME})…`);

  await mongoose.connect(MONGODB_URI as string, {
    dbName: MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
  });

  log('Connected.');

  const adminId = await seedAdminUser();
  const testUserId = await seedTestUser();
  await seedConversations(adminId, testUserId);

  log('Seed complete.');
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function cleanup(): Promise<void> {
  try {
    await mongoose.connection.close(false);
    log('MongoDB connection closed.');
  } catch {
    // best-effort
  }
}

process.on('SIGINT', () => void cleanup().then(() => process.exit(0)));
process.on('SIGTERM', () => void cleanup().then(() => process.exit(0)));

main()
  .catch((err: unknown) => {
    console.error('[seed] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(() => void cleanup());
