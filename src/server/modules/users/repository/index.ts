import mongoose from 'mongoose';
import { UserModel, type IUser } from '../../../database/models/User.js';
import { AuditLogModel } from '../../../database/models/AuditLog.js';
import { logger } from '../../../logger/index.js';
import type { UserListQuery } from '../types/index.js';

export class UsersRepository {
  async findById(id: string): Promise<IUser | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findById(id).exec();
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return UserModel.findOne({ username }).exec();
  }

  async findMany(query: UserListQuery): Promise<{ users: IUser[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sort = 'createdAt',
      order = 'desc',
    } = query;

    const filter: Record<string, unknown> = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter['$or'] = [{ username: regex }, { email: regex }];
    }

    if (role) {
      filter['role'] = role;
    }

    if (status) {
      filter['status'] = status;
    }

    const sortDir = order === 'asc' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { [sort]: sortDir };

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(filter).sort(sortObj).skip(skip).limit(limit).exec(),
      UserModel.countDocuments(filter).exec(),
    ]);

    return { users, total };
  }

  async updateUser(
    id: string,
    data: Partial<Pick<IUser, 'username' | 'phone' | 'lastSeen' | 'status'>>,
  ): Promise<IUser | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    ).exec();
  }

  async softDeleteUser(id: string): Promise<IUser | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return UserModel.findByIdAndUpdate(
      id,
      { $set: { status: 'deleted', deletedAt: new Date() } },
      { returnDocument: 'after' },
    ).exec();
  }

  async updateStatus(id: string, status: string, _reason?: string): Promise<IUser | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const updateData: Partial<IUser> = { status: status as IUser['status'] };
    if (status === 'deleted') {
      updateData.deletedAt = new Date();
    }
    return UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true },
    ).exec();
  }

  async logAudit(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    changes?: { before: unknown; after: unknown };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await AuditLogModel.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    } catch (err) {
      logger.error('Failed to create audit log', {
        error: err instanceof Error ? err.message : String(err),
        data,
      });
    }
  }
}
