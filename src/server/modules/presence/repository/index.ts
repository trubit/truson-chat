import mongoose from 'mongoose';
import { PresenceModel, type IPresence } from '../../../database/models/Presence.js';
import type { UpdatePresenceDto } from '../types/index.js';

export class PresenceRepository {
  async findByUserId(userId: string): Promise<IPresence | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    return PresenceModel.findOne({ userId: new mongoose.Types.ObjectId(userId) }).exec();
  }

  async upsert(
    userId: string,
    data: Partial<UpdatePresenceDto & { lastSeen?: Date }>,
  ): Promise<IPresence> {
    if (!mongoose.isValidObjectId(userId)) {
      throw new Error('Invalid userId');
    }
    const setFields: Record<string, unknown> = {};
    if (data.status !== undefined) setFields['status'] = data.status;
    if (data.customStatus !== undefined) setFields['customStatus'] = data.customStatus;
    if (data.statusMessage !== undefined) setFields['statusMessage'] = data.statusMessage;
    if (data.statusExpiresAt !== undefined) setFields['statusExpiresAt'] = data.statusExpiresAt;
    if (data.lastSeen !== undefined) setFields['lastSeen'] = data.lastSeen;

    const result = await PresenceModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: setFields },
      { upsert: true, returnDocument: 'after' },
    ).exec();
    // result is guaranteed non-null with upsert: true
    return result as IPresence;
  }

  async updateLastSeen(userId: string): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) return;
    await PresenceModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { lastSeen: new Date() } },
      { upsert: true, returnDocument: 'after' },
    ).exec();
  }

  async findManyByUserIds(userIds: string[]): Promise<IPresence[]> {
    const validIds = userIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) return [];
    return PresenceModel.find({
      userId: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).exec();
  }

  async setOffline(userId: string): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) return;
    await PresenceModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { status: 'offline', lastSeen: new Date() } },
      { upsert: true, returnDocument: 'after' },
    ).exec();
  }
}
