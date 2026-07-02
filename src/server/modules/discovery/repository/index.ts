import mongoose from 'mongoose';
import { UserModel, type IUser } from '../../../database/models/User.js';
import type { IProfile } from '../../../database/models/Profile.js';

export class DiscoveryRepository {
  async searchUsers(
    searchQuery: string,
    excludeUserIds: string[],
    page: number,
    limit: number,
  ): Promise<{ users: Array<{ user: IUser; profile: IProfile | null }>; total: number }> {
    const excludeOids = excludeUserIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchQuery);
    const orConditions: Record<string, unknown>[] = [
      { username: { $regex: searchQuery, $options: 'i' } },
    ];
    if (isEmail) {
      orConditions.push({ email: searchQuery.toLowerCase() });
    }

    const matchStage = {
      $match: {
        status: { $nin: ['deleted', 'banned'] },
        _id: { $nin: excludeOids },
        $or: orConditions,
      },
    };

    const pipeline = [
      matchStage,
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profileArr',
        },
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ['$profileArr', 0] },
        },
      },
      { $unset: 'profileArr' },
    ];

    const [results, countResult] = await Promise.all([
      UserModel.aggregate([
        ...pipeline,
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]).exec() as Promise<Array<Record<string, unknown>>>,
      UserModel.aggregate([...pipeline, { $count: 'total' }]).exec() as Promise<
        Array<{ total: number }>
      >,
    ]);

    const total: number = countResult[0]?.total ?? 0;

    const users = results.map((r) => ({
      user: r as unknown as IUser,
      profile: (r['profile'] as IProfile | null | undefined) ?? null,
    }));

    return { users, total };
  }

  async findRecentlyActiveUsers(
    excludeUserIds: string[],
    limit: number,
  ): Promise<Array<{ user: IUser; profile: IProfile | null }>> {
    const excludeOids = excludeUserIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const results = (await UserModel.aggregate([
      {
        $match: {
          status: 'active',
          _id: { $nin: excludeOids },
          lastSeen: { $exists: true },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profileArr',
        },
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ['$profileArr', 0] },
        },
      },
      { $unset: 'profileArr' },
    ]).exec()) as Array<Record<string, unknown>>;

    return results.map((r) => ({
      user: r as unknown as IUser,
      profile: (r['profile'] as IProfile | null | undefined) ?? null,
    }));
  }
}
