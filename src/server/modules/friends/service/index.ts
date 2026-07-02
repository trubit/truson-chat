import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import type { IFriendRequest } from '../../../database/models/FriendRequest.js';
import type { IFriendship } from '../../../database/models/Friendship.js';
import type { FriendRequestRepository, FriendshipRepository } from '../repository/index.js';
import type {
  FriendListQuery,
  FriendPaginatedResult,
  FriendRequestStatus,
  FriendshipStatusResult,
  IFriendData,
  IFriendRequestData,
  SendFriendRequestDto,
} from '../types/index.js';

export class FriendsService {
  constructor(
    private readonly requestRepo: FriendRequestRepository,
    private readonly friendshipRepo: FriendshipRepository,
  ) {}

  async sendRequest(senderId: string, dto: SendFriendRequestDto): Promise<IFriendRequestData> {
    if (!mongoose.isValidObjectId(dto.userId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_USER_ID');
    }

    if (senderId === dto.userId) {
      throw new AppError('Cannot send friend request to yourself', 400, 'CANNOT_FRIEND_SELF');
    }

    const targetUser = await UserModel.findById(dto.userId).exec();
    if (!targetUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const alreadyFriends = await this.friendshipRepo.areFriends(senderId, dto.userId);
    if (alreadyFriends) {
      throw new AppError('Already friends', 409, 'ALREADY_FRIENDS');
    }

    const existingRequest = await this.requestRepo.findAnyPendingBetween(senderId, dto.userId);
    if (existingRequest) {
      throw new AppError('Friend request already pending', 409, 'REQUEST_ALREADY_EXISTS');
    }

    const request = await this.requestRepo.create(senderId, dto.userId, dto.message);
    return this.populateRequest(request);
  }

  async acceptRequest(userId: string, requestId: string): Promise<IFriendData> {
    if (!mongoose.isValidObjectId(requestId)) {
      throw new AppError('Invalid request ID', 400, 'INVALID_REQUEST_ID');
    }

    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.recipientId.toString() !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (request.status !== 'pending') {
      throw new AppError('Request is not pending', 409, 'REQUEST_NOT_PENDING');
    }

    const senderId = request.senderId.toString();

    await this.friendshipRepo.create(userId, senderId);
    await this.requestRepo.updateStatus(requestId, 'accepted', new Date());

    const [senderInfo, friendship, senderProfile] = await Promise.all([
      this.getUserInfo(request.senderId),
      this.friendshipRepo.findByUsers(userId, senderId),
      ProfileModel.findOne({ userId: request.senderId }).exec(),
    ]);

    return {
      friendshipId: friendship ? friendship._id.toString() : '',
      friendId: senderInfo.id,
      username: senderInfo.username,
      displayName: senderInfo.displayName,
      avatar: senderInfo.avatar,
      bio: senderProfile?.bio,
      friendedAt: new Date().toISOString(),
    };
  }

  async rejectRequest(userId: string, requestId: string): Promise<void> {
    if (!mongoose.isValidObjectId(requestId)) {
      throw new AppError('Invalid request ID', 400, 'INVALID_REQUEST_ID');
    }

    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.recipientId.toString() !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (request.status !== 'pending') {
      throw new AppError('Request is not pending', 409, 'REQUEST_NOT_PENDING');
    }

    await this.requestRepo.updateStatus(requestId, 'rejected', new Date());
  }

  async cancelRequest(userId: string, requestId: string): Promise<void> {
    if (!mongoose.isValidObjectId(requestId)) {
      throw new AppError('Invalid request ID', 400, 'INVALID_REQUEST_ID');
    }

    const request = await this.requestRepo.findById(requestId);
    if (!request) {
      throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.senderId.toString() !== userId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (request.status !== 'pending') {
      throw new AppError('Request is not pending', 409, 'REQUEST_NOT_PENDING');
    }

    await this.requestRepo.updateStatus(requestId, 'cancelled');
  }

  async getReceivedRequests(
    userId: string,
    page: number,
    limit: number,
  ): Promise<FriendPaginatedResult<IFriendRequestData>> {
    const { requests, total } = await this.requestRepo.findPendingByRecipient(userId, page, limit);
    const items = await Promise.all(requests.map((r) => this.populateRequest(r)));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async getSentRequests(
    userId: string,
    page: number,
    limit: number,
  ): Promise<FriendPaginatedResult<IFriendRequestData>> {
    const { requests, total } = await this.requestRepo.findSentByUser(userId, page, limit);
    const items = await Promise.all(requests.map((r) => this.populateRequest(r)));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async getFriends(
    userId: string,
    query: FriendListQuery,
  ): Promise<FriendPaginatedResult<IFriendData>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { friendships, total } = await this.friendshipRepo.findByUser(
      userId,
      page,
      limit,
      query.search,
    );

    const items = await Promise.all(
      friendships.map((f) => this.populateFriendship(f, userId)),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    if (!mongoose.isValidObjectId(friendId)) {
      throw new AppError('Invalid friend ID', 400, 'INVALID_FRIEND_ID');
    }

    const areFriends = await this.friendshipRepo.areFriends(userId, friendId);
    if (!areFriends) {
      throw new AppError('Not friends', 404, 'NOT_FRIENDS');
    }

    await this.friendshipRepo.remove(userId, friendId);
  }

  async checkFriendshipStatus(
    userId: string,
    targetId: string,
  ): Promise<FriendshipStatusResult> {
    const areFriends = await this.friendshipRepo.areFriends(userId, targetId);

    if (areFriends) {
      return { areFriends: true };
    }

    const pending = await this.requestRepo.findAnyPendingBetween(userId, targetId);
    if (!pending) {
      return { areFriends: false };
    }

    const direction: 'sent' | 'received' =
      pending.senderId.toString() === userId ? 'sent' : 'received';

    return {
      areFriends: false,
      pendingRequest: {
        id: pending._id.toString(),
        direction,
        status: pending.status as FriendRequestStatus,
        createdAt: pending.createdAt.toISOString(),
      },
    };
  }

  async getFriendCount(userId: string): Promise<number> {
    return this.friendshipRepo.countFriends(userId);
  }

  private async populateRequest(request: IFriendRequest): Promise<IFriendRequestData> {
    const [sender, recipient] = await Promise.all([
      this.getUserInfo(request.senderId),
      this.getUserInfo(request.recipientId),
    ]);

    return {
      id: request._id.toString(),
      sender,
      recipient,
      status: request.status as FriendRequestStatus,
      message: request.message,
      expiresAt: request.expiresAt.toISOString(),
      respondedAt: request.respondedAt?.toISOString(),
      createdAt: request.createdAt.toISOString(),
    };
  }

  private async getUserInfo(
    userId: mongoose.Types.ObjectId,
  ): Promise<{ id: string; username: string; displayName: string; avatar?: string }> {
    const [user, profile] = await Promise.all([
      UserModel.findById(userId).exec(),
      ProfileModel.findOne({ userId }).exec(),
    ]);

    const username = user?.username ?? '';
    const displayName = profile?.displayName ?? username;
    const avatar = profile?.avatar?.url;

    return {
      id: userId.toString(),
      username,
      displayName,
      avatar,
    };
  }

  private async populateFriendship(
    friendship: IFriendship,
    currentUserId: string,
  ): Promise<IFriendData> {
    const u1 = friendship.user1Id.toString();
    const friendObjId = u1 === currentUserId ? friendship.user2Id : friendship.user1Id;

    const info = await this.getUserInfo(friendObjId);
    const profile = await ProfileModel.findOne({ userId: friendObjId }).exec();

    return {
      friendshipId: friendship._id.toString(),
      friendId: info.id,
      username: info.username,
      displayName: info.displayName,
      avatar: info.avatar,
      bio: profile?.bio,
      friendedAt: friendship.createdAt.toISOString(),
    };
  }
}
