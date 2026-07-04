import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { ChannelModel, ChannelMemberModel } from '../../../database/models/index.js';
import { groupRepository } from '../../groups/repository/index.js';
import { MEMBER_ROLES } from '../../../../shared/constants/roles.js';
import type { IChannel }        from '../../../database/models/Channel.js';
import type {
  ChannelSummary, CreateChannelPayload, UpdateChannelPayload,
} from '../../../../shared/types/group.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function toSummary(c: IChannel): ChannelSummary {
  return {
    _id:             c._id.toString(),
    groupId:         c.groupId.toString(),
    name:            c.name,
    description:     c.description,
    type:            c.type,
    status:          c.status,
    position:        c.position,
    isPrivate:       c.isPrivate,
    slowModeSeconds: c.slowModeSeconds,
    topic:           c.topic,
    lastMessageAt:   c.lastMessageAt?.toISOString(),
    createdAt:       c.createdAt.toISOString(),
    updatedAt:       c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// ChannelService
// ---------------------------------------------------------------------------

export class ChannelService {

  async createChannel(userId: string, dto: CreateChannelPayload): Promise<ChannelSummary> {
    await this.requireGroupPermission(dto.groupId, userId, 'manage_channels');

    const channel = await ChannelModel.create({
      groupId:         new mongoose.Types.ObjectId(dto.groupId),
      name:            dto.name,
      description:     dto.description,
      type:            dto.type,
      isPrivate:       dto.isPrivate ?? false,
      slowModeSeconds: dto.slowModeSeconds ?? 0,
      topic:           dto.topic,
      position:        dto.position ?? 0,
      createdBy:       new mongoose.Types.ObjectId(userId),
    });

    return toSummary(channel);
  }

  async getChannels(userId: string, groupId: string): Promise<ChannelSummary[]> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'active') throw new AppError('Not a member', 403, 'NOT_MEMBER');

    const channels = await ChannelModel.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      status: 'active',
    }).sort({ position: 1, name: 1 }).exec();

    // Filter private channels — only show if user is a ChannelMember
    const result: ChannelSummary[] = [];
    for (const ch of channels) {
      if (!ch.isPrivate) {
        result.push(toSummary(ch));
        continue;
      }
      const access = await ChannelMemberModel.findOne({
        channelId: ch._id,
        userId:    new mongoose.Types.ObjectId(userId),
      }).exec();
      if (access || (['owner', 'admin'] as string[]).includes(membership.role)) {
        result.push(toSummary(ch));
      }
    }
    return result;
  }

  async getChannel(userId: string, channelId: string): Promise<ChannelSummary> {
    const channel = await ChannelModel.findById(new mongoose.Types.ObjectId(channelId)).exec();
    if (!channel || channel.status === 'deleted') throw new AppError('Channel not found', 404, 'NOT_FOUND');

    const membership = await groupRepository.findMember(channel.groupId.toString(), userId);
    if (!membership || membership.status !== 'active') throw new AppError('Not a member', 403, 'NOT_MEMBER');

    if (channel.isPrivate) {
      const access = await ChannelMemberModel.findOne({
        channelId: channel._id,
        userId:    new mongoose.Types.ObjectId(userId),
      }).exec();
      if (!access && !(['owner', 'admin'] as string[]).includes(membership.role)) {
        throw new AppError('Channel not found', 404, 'NOT_FOUND');
      }
    }

    return toSummary(channel);
  }

  async updateChannel(userId: string, channelId: string, dto: UpdateChannelPayload): Promise<ChannelSummary> {
    const channel = await ChannelModel.findById(new mongoose.Types.ObjectId(channelId)).exec();
    if (!channel || channel.status === 'deleted') throw new AppError('Channel not found', 404, 'NOT_FOUND');

    await this.requireGroupPermission(channel.groupId.toString(), userId, 'manage_channels');

    const $set: Record<string, unknown> = {};
    if (dto.name            !== undefined) $set['name']            = dto.name;
    if (dto.description     !== undefined) $set['description']     = dto.description;
    if (dto.isPrivate       !== undefined) $set['isPrivate']       = dto.isPrivate;
    if (dto.slowModeSeconds !== undefined) $set['slowModeSeconds'] = dto.slowModeSeconds;
    if (dto.topic           !== undefined) $set['topic']           = dto.topic;
    if (dto.position        !== undefined) $set['position']        = dto.position;

    const updated = await ChannelModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(channelId),
      { $set },
      { returnDocument: 'after' },
    ).exec();

    if (!updated) throw new AppError('Channel not found', 404, 'NOT_FOUND');
    return toSummary(updated);
  }

  async deleteChannel(userId: string, channelId: string): Promise<void> {
    const channel = await ChannelModel.findById(new mongoose.Types.ObjectId(channelId)).exec();
    if (!channel || channel.status === 'deleted') throw new AppError('Channel not found', 404, 'NOT_FOUND');

    await this.requireGroupPermission(channel.groupId.toString(), userId, 'manage_channels');

    await ChannelModel.findByIdAndUpdate(new mongoose.Types.ObjectId(channelId), {
      $set: { status: 'deleted', deletedAt: new Date() },
    }).exec();
  }

  async addChannelMember(actorId: string, channelId: string, userId: string): Promise<void> {
    const channel = await ChannelModel.findById(new mongoose.Types.ObjectId(channelId)).exec();
    if (!channel) throw new AppError('Channel not found', 404, 'NOT_FOUND');

    await this.requireGroupPermission(channel.groupId.toString(), actorId, 'manage_channels');

    await ChannelMemberModel.findOneAndUpdate(
      { channelId: channel._id, userId: new mongoose.Types.ObjectId(userId) },
      { $setOnInsert: { addedBy: new mongoose.Types.ObjectId(actorId) } },
      { upsert: true },
    ).exec();
  }

  async removeChannelMember(actorId: string, channelId: string, userId: string): Promise<void> {
    const channel = await ChannelModel.findById(new mongoose.Types.ObjectId(channelId)).exec();
    if (!channel) throw new AppError('Channel not found', 404, 'NOT_FOUND');

    await this.requireGroupPermission(channel.groupId.toString(), actorId, 'manage_channels');

    await ChannelMemberModel.findOneAndDelete({
      channelId: channel._id,
      userId:    new mongoose.Types.ObjectId(userId),
    }).exec();
  }

  // ——— Private helpers ———

  private async requireGroupPermission(groupId: string, userId: string, _permission: string): Promise<void> {
    const membership = await groupRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'active') throw new AppError('Not a group member', 403, 'NOT_MEMBER');
    if (!([MEMBER_ROLES.OWNER, MEMBER_ROLES.ADMIN] as string[]).includes(membership.role)) throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }
}

export const channelService = new ChannelService();
