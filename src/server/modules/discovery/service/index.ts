import mongoose from 'mongoose';
import { redisClient } from '../../../redis/connection.js';
import { BlockedUserModel } from '../../../database/models/BlockedUser.js';
import { FriendRequestModel } from '../../../database/models/FriendRequest.js';
import { FriendshipModel } from '../../../database/models/Friendship.js';
import { ContactModel } from '../../../database/models/Contact.js';
import type { DiscoveryRepository } from '../repository/index.js';
import type {
  DiscoveredUser,
  UserSearchQuery,
  RecentSearch,
  SearchResult,
} from '../types/index.js';
import type { IUser } from '../../../database/models/User.js';
import type { IProfile } from '../../../database/models/Profile.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RECENT_SEARCHES = 20;

function recentSearchesKey(userId: string): string {
  return `recent_searches:${userId}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DiscoveryService {
  constructor(private repo: DiscoveryRepository) {}

  private async buildDiscoveredUser(
    requesterId: string,
    user: IUser,
    profile: IProfile | null,
  ): Promise<DiscoveredUser> {
    const userId = (user._id as mongoose.Types.ObjectId).toString();
    const ids = [requesterId, userId].sort();

    const [friendship, contact, pendingReq] = await Promise.all([
      FriendshipModel.findOne({
        user1Id: new mongoose.Types.ObjectId(ids[0] as string),
        user2Id: new mongoose.Types.ObjectId(ids[1] as string),
      })
        .select('_id')
        .exec(),
      ContactModel.findOne({
        ownerId: new mongoose.Types.ObjectId(requesterId),
        contactUserId: new mongoose.Types.ObjectId(userId),
      })
        .select('_id')
        .exec(),
      FriendRequestModel.findOne({
        $or: [
          {
            senderId: new mongoose.Types.ObjectId(requesterId),
            recipientId: new mongoose.Types.ObjectId(userId),
            status: 'pending',
          },
          {
            senderId: new mongoose.Types.ObjectId(userId),
            recipientId: new mongoose.Types.ObjectId(requesterId),
            status: 'pending',
          },
        ],
      })
        .select('senderId')
        .exec(),
    ]);

    let pendingRequest: 'sent' | 'received' | undefined;
    if (pendingReq) {
      pendingRequest = pendingReq.senderId.toString() === requesterId ? 'sent' : 'received';
    }

    return {
      id: userId,
      username: user.username,
      displayName: profile?.displayName ?? '',
      avatar: profile?.avatar?.url,
      bio: profile?.bio,
      mutualFriendCount: 0,
      isFriend: friendship !== null,
      isContact: contact !== null,
      pendingRequest,
    };
  }

  private async saveRecentSearch(
    requesterId: string,
    user: { id: string; username: string; displayName: string; avatar?: string },
  ): Promise<void> {
    try {
      const entry: RecentSearch = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        searchedAt: new Date().toISOString(),
      };
      const key = recentSearchesKey(requesterId);
      await redisClient.lpush(key, JSON.stringify(entry));
      await redisClient.ltrim(key, 0, MAX_RECENT_SEARCHES - 1);
    } catch {
      // Redis unavailable — degrade gracefully
    }
  }

  async searchUsers(requesterId: string, query: UserSearchQuery): Promise<SearchResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Collect all user IDs involved in any block relationship with requester
    const blockedDocs = await BlockedUserModel.find({
      $or: [
        { blockerId: new mongoose.Types.ObjectId(requesterId) },
        { blockedId: new mongoose.Types.ObjectId(requesterId) },
      ],
    })
      .select('blockerId blockedId')
      .exec();

    const blockedIds = new Set<string>();
    for (const doc of blockedDocs) {
      blockedIds.add(doc.blockerId.toString());
      blockedIds.add(doc.blockedId.toString());
    }
    const excludeIds = [requesterId, ...Array.from(blockedIds)];

    const { users, total } = await this.repo.searchUsers(query.q, excludeIds, page, limit);

    const discoveredUsers = await Promise.all(
      users.map(({ user, profile }) => this.buildDiscoveredUser(requesterId, user, profile)),
    );

    // Save the first result to recent searches when there are results
    if (discoveredUsers.length > 0 && discoveredUsers[0]) {
      const first = discoveredUsers[0];
      await this.saveRecentSearch(requesterId, {
        id: first.id,
        username: first.username,
        displayName: first.displayName,
        avatar: first.avatar,
      });
    }

    return {
      users: discoveredUsers,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async getSuggestions(requesterId: string, limit: number): Promise<DiscoveredUser[]> {
    const [friendships, contacts, blockedDocs] = await Promise.all([
      FriendshipModel.find({
        $or: [
          { user1Id: new mongoose.Types.ObjectId(requesterId) },
          { user2Id: new mongoose.Types.ObjectId(requesterId) },
        ],
      })
        .select('user1Id user2Id')
        .exec(),
      ContactModel.find({ ownerId: new mongoose.Types.ObjectId(requesterId) })
        .select('contactUserId')
        .exec(),
      BlockedUserModel.find({
        $or: [
          { blockerId: new mongoose.Types.ObjectId(requesterId) },
          { blockedId: new mongoose.Types.ObjectId(requesterId) },
        ],
      })
        .select('blockerId blockedId')
        .exec(),
    ]);

    const excludeIds = new Set<string>([requesterId]);
    for (const f of friendships) {
      excludeIds.add(f.user1Id.toString());
      excludeIds.add(f.user2Id.toString());
    }
    for (const c of contacts) {
      excludeIds.add(c.contactUserId.toString());
    }
    for (const b of blockedDocs) {
      excludeIds.add(b.blockerId.toString());
      excludeIds.add(b.blockedId.toString());
    }

    const results = await this.repo.findRecentlyActiveUsers(Array.from(excludeIds), limit);

    return Promise.all(
      results.map(({ user, profile }) => this.buildDiscoveredUser(requesterId, user, profile)),
    );
  }

  async getRecentSearches(userId: string): Promise<RecentSearch[]> {
    try {
      const items = await redisClient.lrange(recentSearchesKey(userId), 0, MAX_RECENT_SEARCHES - 1);
      return items.map((item) => JSON.parse(item) as RecentSearch);
    } catch {
      return [];
    }
  }

  async clearRecentSearches(userId: string): Promise<void> {
    try {
      await redisClient.del(recentSearchesKey(userId));
    } catch {
      // Redis unavailable — degrade gracefully
    }
  }
}
