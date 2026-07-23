import { AppError } from '../../../middlewares/errorHandler.js';
import { GroupModel } from '../../../database/models/index.js';
import { communityRepository } from '../repository/index.js';
import { groupRepository } from '../../groups/repository/index.js';
import { MEMBER_ROLES } from '../../../../shared/constants/roles.js';
import type { ICommunity } from '../../../database/models/Community.js';
import type { ICommunityMember } from '../../../database/models/CommunityMember.js';
import type {
  CommunitySummary,
  CommunityDetail,
  CreateCommunityPayload,
  UpdateCommunityPayload,
  GroupSummary,
} from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSummary(c: ICommunity): CommunitySummary {
  return {
    _id: c._id.toString(),
    name: c.name,
    handle: c.handle,
    description: c.description,
    type: c.type,
    status: c.status,
    avatar: c.avatar,
    memberCount: c.memberCount,
    groupCount: c.groupCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toDetail(
  c: ICommunity,
  myMembership?: ICommunityMember | null,
  groups?: GroupSummary[],
): CommunityDetail {
  return {
    ...toSummary(c),
    coverImage: c.coverImage,
    rules: c.rules,
    settings: c.settings as CommunityDetail['settings'],
    categories: c.categories,
    tags: c.tags,
    createdBy: c.createdBy.toString(),
    myMembership: myMembership
      ? {
          _id: myMembership._id.toString(),
          communityId: myMembership.communityId.toString(),
          userId: myMembership.userId.toString(),
          role: myMembership.role,
          joinedAt: myMembership.joinedAt.toISOString(),
          displayName: '',
        }
      : null,
    groups,
  };
}

// ---------------------------------------------------------------------------
// CommunityService
// ---------------------------------------------------------------------------

export class CommunityService {
  async createCommunity(userId: string, dto: CreateCommunityPayload): Promise<CommunityDetail> {
    if (dto.handle) {
      const existing = await communityRepository.findByHandle(dto.handle);
      if (existing) throw new AppError('Handle already taken', 409, 'HANDLE_TAKEN');
    }

    const community = await communityRepository.create({ ...dto, createdBy: userId });
    await communityRepository.addMember({
      communityId: community._id.toString(),
      userId,
      role: MEMBER_ROLES.OWNER,
    });
    const membership = await communityRepository.findMember(community._id.toString(), userId);
    return toDetail(community, membership);
  }

  async getCommunity(communityId: string, viewerId?: string): Promise<CommunityDetail> {
    const community = await communityRepository.findById(communityId);
    if (!community || community.deletedAt)
      throw new AppError('Community not found', 404, 'NOT_FOUND');

    let membership: ICommunityMember | null = null;
    if (viewerId) membership = await communityRepository.findMember(communityId, viewerId);

    if (community.type === 'private' && !membership) {
      throw new AppError('Community not found', 404, 'NOT_FOUND');
    }

    // Fetch linked groups (limit 20 for overview)
    const groupIds = await communityRepository.getCommunityGroups(communityId);
    const groupDocs = await GroupModel.find({
      _id: { $in: groupIds.slice(0, 20) },
      deletedAt: null,
    }).exec();

    const groups: GroupSummary[] = groupDocs.map((g) => ({
      _id: g._id.toString(),
      name: g.name,
      handle: g.handle,
      description: g.description,
      type: g.type,
      status: g.status,
      avatar: g.avatar,
      memberCount: g.memberCount,
      communityId: g.communityId?.toString(),
      lastMessageAt: g.lastMessageAt?.toISOString(),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    return toDetail(community, membership, groups);
  }

  async getMyCommunities(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ communities: CommunitySummary[]; total: number; hasMore: boolean }> {
    const { communities, total } = await communityRepository.findByUser(userId, { page, limit });
    return { communities: communities.map(toSummary), total, hasMore: total > page * limit };
  }

  async discoverCommunities(opts: {
    page: number;
    limit: number;
    q?: string;
  }): Promise<{ communities: CommunitySummary[]; total: number; hasMore: boolean }> {
    const { communities, total } = await communityRepository.findMany({ ...opts, type: 'public' });
    return {
      communities: communities.map(toSummary),
      total,
      hasMore: total > opts.page * opts.limit,
    };
  }

  async updateCommunity(
    userId: string,
    communityId: string,
    dto: UpdateCommunityPayload,
  ): Promise<CommunityDetail> {
    await this.requireRole(communityId, userId, [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN]);

    if (dto.handle) {
      const existing = await communityRepository.findByHandle(dto.handle);
      if (existing && existing._id.toString() !== communityId) {
        throw new AppError('Handle already taken', 409, 'HANDLE_TAKEN');
      }
    }

    const updated = await communityRepository.update(communityId, dto);
    if (!updated) throw new AppError('Community not found', 404, 'NOT_FOUND');

    const membership = await communityRepository.findMember(communityId, userId);
    return toDetail(updated, membership);
  }

  async deleteCommunity(userId: string, communityId: string): Promise<void> {
    await this.requireRole(communityId, userId, [MEMBER_ROLES.OWNER]);
    await communityRepository.softDelete(communityId);
  }

  async joinCommunity(userId: string, communityId: string): Promise<void> {
    const community = await communityRepository.findById(communityId);
    if (!community || community.deletedAt)
      throw new AppError('Community not found', 404, 'NOT_FOUND');
    if (community.type === 'private')
      throw new AppError('This community requires an invite', 403, 'INVITE_REQUIRED');

    const existing = await communityRepository.findMember(communityId, userId);
    if (existing) throw new AppError('Already a member', 409, 'ALREADY_MEMBER');

    await communityRepository.addMember({ communityId, userId, role: MEMBER_ROLES.MEMBER });
  }

  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    const membership = await communityRepository.findMember(communityId, userId);
    if (!membership) throw new AppError('Not a member', 400, 'NOT_MEMBER');
    if (membership.role === MEMBER_ROLES.OWNER)
      throw new AppError(
        'Owner cannot leave — transfer ownership first',
        400,
        'OWNER_CANNOT_LEAVE',
      );
    await communityRepository.removeMember(communityId, userId);
  }

  async addGroupToCommunity(userId: string, communityId: string, groupId: string): Promise<void> {
    await this.requireRole(communityId, userId, [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN]);

    // Requester must also be owner/admin of the group
    const groupMember = await groupRepository.findMember(groupId, userId);
    if (
      !groupMember ||
      !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(groupMember.role)
    ) {
      throw new AppError(
        'You must be a group owner or admin to add it to a community',
        403,
        'FORBIDDEN',
      );
    }

    await communityRepository.addGroup(communityId, groupId, userId);
  }

  async removeGroupFromCommunity(
    userId: string,
    communityId: string,
    groupId: string,
  ): Promise<void> {
    await this.requireRole(communityId, userId, [MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN]);
    await communityRepository.removeGroup(communityId, groupId);
  }

  // ——— Private helpers ———

  async requireRole(
    communityId: string,
    userId: string,
    roles: string[],
  ): Promise<ICommunityMember> {
    const membership = await communityRepository.findMember(communityId, userId);
    if (!membership) throw new AppError('Not a community member', 403, 'NOT_MEMBER');
    if (!roles.includes(membership.role))
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    return membership;
  }
}

export const communityService = new CommunityService();
