import mongoose from 'mongoose';
import { FriendRequestModel, type IFriendRequest } from '../../../database/models/FriendRequest.js';
import { FriendshipModel, type IFriendship } from '../../../database/models/Friendship.js';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import type { FriendRequestStatus } from '../types/index.js';

const ObjId = mongoose.Types.ObjectId;

// ---------------------------------------------------------------------------
// FriendRequestRepository
// ---------------------------------------------------------------------------

export class FriendRequestRepository {
  async create(senderId: string, recipientId: string, message?: string): Promise<IFriendRequest> {
    return FriendRequestModel.create({
      senderId: new ObjId(senderId),
      recipientId: new ObjId(recipientId),
      message,
    });
  }

  async findById(id: string): Promise<IFriendRequest | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return FriendRequestModel.findById(new ObjId(id)).exec();
  }

  async findBySenderAndRecipient(
    senderId: string,
    recipientId: string,
  ): Promise<IFriendRequest | null> {
    return FriendRequestModel.findOne({
      senderId: new ObjId(senderId),
      recipientId: new ObjId(recipientId),
      status: 'pending' as const,
    }).exec();
  }

  async findPendingByRecipient(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<{ requests: IFriendRequest[]; total: number }> {
    const filter = {
      recipientId: new ObjId(recipientId),
      status: 'pending' as const,
      expiresAt: { $gt: new Date() },
    };

    const skip = (page - 1) * limit;

    const [total, requests] = await Promise.all([
      FriendRequestModel.countDocuments(filter).exec(),
      FriendRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    ]);

    return { requests, total };
  }

  async findSentByUser(
    senderId: string,
    page: number,
    limit: number,
  ): Promise<{ requests: IFriendRequest[]; total: number }> {
    const filter = {
      senderId: new ObjId(senderId),
      status: 'pending' as const,
    };

    const skip = (page - 1) * limit;

    const [total, requests] = await Promise.all([
      FriendRequestModel.countDocuments(filter).exec(),
      FriendRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    ]);

    return { requests, total };
  }

  async updateStatus(
    id: string,
    status: FriendRequestStatus,
    respondedAt?: Date,
  ): Promise<IFriendRequest | null> {
    if (!mongoose.isValidObjectId(id)) return null;

    const setFields: Record<string, unknown> = { status };
    if (respondedAt !== undefined) {
      setFields['respondedAt'] = respondedAt;
    }

    return FriendRequestModel.findOneAndUpdate(
      { _id: new ObjId(id) },
      { $set: setFields },
      { returnDocument: 'after' },
    ).exec();
  }

  async findAnyPendingBetween(user1Id: string, user2Id: string): Promise<IFriendRequest | null> {
    return FriendRequestModel.findOne({
      status: 'pending' as const,
      $or: [
        { senderId: new ObjId(user1Id), recipientId: new ObjId(user2Id) },
        { senderId: new ObjId(user2Id), recipientId: new ObjId(user1Id) },
      ],
    }).exec();
  }
}

// ---------------------------------------------------------------------------
// FriendshipRepository
// ---------------------------------------------------------------------------

const sortIds = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export class FriendshipRepository {
  async create(userId1: string, userId2: string): Promise<IFriendship> {
    const [lesser, greater] = sortIds(userId1, userId2);
    return FriendshipModel.create({
      user1Id: new ObjId(lesser),
      user2Id: new ObjId(greater),
    });
  }

  async findByUsers(userId1: string, userId2: string): Promise<IFriendship | null> {
    const [lesser, greater] = sortIds(userId1, userId2);
    return FriendshipModel.findOne({
      user1Id: new ObjId(lesser),
      user2Id: new ObjId(greater),
    }).exec();
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ friendships: IFriendship[]; total: number }> {
    const userObjId = new ObjId(userId);
    const skip = (page - 1) * limit;

    if (search) {
      const regex = new RegExp(search, 'i');

      // Find matching users
      const matchingUsers = await UserModel.find({ username: { $regex: regex } })
        .select('_id')
        .exec();
      const matchingProfiles = await ProfileModel.find({ displayName: { $regex: regex } })
        .select('userId')
        .exec();

      const matchingIds = [
        ...matchingUsers.map((u) => u._id),
        ...matchingProfiles.map((p) => p.userId),
      ];

      const filter = {
        $or: [
          { user1Id: userObjId, user2Id: { $in: matchingIds } },
          { user2Id: userObjId, user1Id: { $in: matchingIds } },
        ],
      };

      const [total, friendships] = await Promise.all([
        FriendshipModel.countDocuments(filter).exec(),
        FriendshipModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      ]);

      return { friendships, total };
    }

    const filter = {
      $or: [{ user1Id: userObjId }, { user2Id: userObjId }],
    };

    const [total, friendships] = await Promise.all([
      FriendshipModel.countDocuments(filter).exec(),
      FriendshipModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    ]);

    return { friendships, total };
  }

  async remove(userId1: string, userId2: string): Promise<void> {
    const [lesser, greater] = sortIds(userId1, userId2);
    await FriendshipModel.deleteOne({
      user1Id: new ObjId(lesser),
      user2Id: new ObjId(greater),
    }).exec();
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.findByUsers(userId1, userId2);
    return friendship !== null;
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const userObjId = new ObjId(userId);
    const friendships = await FriendshipModel.find({
      $or: [{ user1Id: userObjId }, { user2Id: userObjId }],
    }).exec();

    return friendships.map((f) => {
      const u1 = f.user1Id.toString();
      const u2 = f.user2Id.toString();
      return u1 === userId ? u2 : u1;
    });
  }

  async countFriends(userId: string): Promise<number> {
    const userObjId = new ObjId(userId);
    return FriendshipModel.countDocuments({
      $or: [{ user1Id: userObjId }, { user2Id: userObjId }],
    }).exec();
  }
}
