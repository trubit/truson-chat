import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { AnnouncementModel } from '../../../database/models/index.js';
import { groupRepository } from '../../groups/repository/index.js';
import { communityRepository } from '../../communities/repository/index.js';
import { MEMBER_ROLES } from '../../../../shared/constants/roles.js';
import type { IAnnouncement } from '../../../database/models/Announcement.js';
import type {
  AnnouncementSummary,
  CreateAnnouncementPayload,
  AnnouncementScope,
} from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toSummary(a: IAnnouncement): AnnouncementSummary {
  return {
    _id: a._id.toString(),
    scope: a.scope,
    groupId: a.groupId?.toString(),
    communityId: a.communityId?.toString(),
    channelId: a.channelId?.toString(),
    authorId: a.authorId.toString(),
    title: a.title,
    content: a.content,
    status: a.status,
    isPinned: a.isPinned,
    scheduledAt: a.scheduledAt?.toISOString(),
    expiresAt: a.expiresAt?.toISOString(),
    publishedAt: a.publishedAt?.toISOString(),
    readCount: a.readCount,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// AnnouncementService
// ---------------------------------------------------------------------------

export class AnnouncementService {
  async create(userId: string, dto: CreateAnnouncementPayload): Promise<AnnouncementSummary> {
    await this.requirePermission(userId, dto.scope, dto.groupId, dto.communityId);

    const publishedAt = dto.scheduledAt ? undefined : new Date();
    const status = dto.scheduledAt ? 'scheduled' : 'active';

    const doc = await AnnouncementModel.create({
      scope: dto.scope,
      groupId: dto.groupId ? new mongoose.Types.ObjectId(dto.groupId) : undefined,
      communityId: dto.communityId ? new mongoose.Types.ObjectId(dto.communityId) : undefined,
      channelId: dto.channelId ? new mongoose.Types.ObjectId(dto.channelId) : undefined,
      authorId: new mongoose.Types.ObjectId(userId),
      title: dto.title,
      content: dto.content,
      isPinned: dto.isPinned ?? false,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      publishedAt,
      status,
    });

    return toSummary(doc);
  }

  async getAnnouncements(
    _userId: string,
    opts: {
      scope: AnnouncementScope;
      groupId?: string;
      communityId?: string;
      channelId?: string;
      page: number;
      limit: number;
    },
  ): Promise<{ announcements: AnnouncementSummary[]; total: number; hasMore: boolean }> {
    const filter: Record<string, unknown> = {
      scope: opts.scope,
      status: { $in: ['active', 'scheduled'] },
    };
    if (opts.groupId) filter['groupId'] = new mongoose.Types.ObjectId(opts.groupId);
    if (opts.communityId) filter['communityId'] = new mongoose.Types.ObjectId(opts.communityId);
    if (opts.channelId) filter['channelId'] = new mongoose.Types.ObjectId(opts.channelId);

    const skip = (opts.page - 1) * opts.limit;
    const [docs, total] = await Promise.all([
      AnnouncementModel.find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(opts.limit)
        .exec(),
      AnnouncementModel.countDocuments(filter).exec(),
    ]);

    return {
      announcements: docs.map(toSummary),
      total,
      hasMore: total > opts.page * opts.limit,
    };
  }

  async update(
    userId: string,
    announcementId: string,
    dto: Partial<CreateAnnouncementPayload> & { isPinned?: boolean },
  ): Promise<AnnouncementSummary> {
    const doc = await AnnouncementModel.findById(
      new mongoose.Types.ObjectId(announcementId),
    ).exec();
    if (!doc || doc.status === 'deleted')
      throw new AppError('Announcement not found', 404, 'NOT_FOUND');

    await this.requirePermission(
      userId,
      doc.scope,
      doc.groupId?.toString(),
      doc.communityId?.toString(),
    );

    const $set: Record<string, unknown> = {};
    if (dto.title !== undefined) $set['title'] = dto.title;
    if (dto.content !== undefined) $set['content'] = dto.content;
    if (dto.isPinned !== undefined) $set['isPinned'] = dto.isPinned;
    if (dto.expiresAt !== undefined) $set['expiresAt'] = new Date(dto.expiresAt);

    const updated = await AnnouncementModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(announcementId),
      { $set },
      { returnDocument: 'after' },
    ).exec();

    if (!updated) throw new AppError('Announcement not found', 404, 'NOT_FOUND');
    return toSummary(updated);
  }

  async delete(userId: string, announcementId: string): Promise<void> {
    const doc = await AnnouncementModel.findById(
      new mongoose.Types.ObjectId(announcementId),
    ).exec();
    if (!doc || doc.status === 'deleted')
      throw new AppError('Announcement not found', 404, 'NOT_FOUND');

    await this.requirePermission(
      userId,
      doc.scope,
      doc.groupId?.toString(),
      doc.communityId?.toString(),
    );

    await AnnouncementModel.findByIdAndUpdate(new mongoose.Types.ObjectId(announcementId), {
      $set: { status: 'deleted', deletedAt: new Date() },
    }).exec();
  }

  // ——— Private ———

  private async requirePermission(
    userId: string,
    scope: AnnouncementScope,
    groupId?: string,
    communityId?: string,
  ): Promise<void> {
    if (scope === 'group' || scope === 'channel') {
      if (!groupId) throw new AppError('groupId required', 400, 'BAD_REQUEST');
      const m = await groupRepository.findMember(groupId, userId);
      if (
        !m ||
        !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN, MEMBER_ROLES.MODERATOR] as string[]).includes(
          m.role,
        )
      ) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
    } else if (scope === 'community') {
      if (!communityId) throw new AppError('communityId required', 400, 'BAD_REQUEST');
      const m = await communityRepository.findMember(communityId, userId);
      if (!m || !([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(m.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
    }
  }
}

export const announcementService = new AnnouncementService();
