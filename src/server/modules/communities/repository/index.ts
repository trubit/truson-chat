import mongoose from 'mongoose';
import {
  CommunityModel,       type ICommunity,
  CommunityMemberModel, type ICommunityMember,
  CommunityGroupModel,
  GroupModel,
} from '../../../database/models/index.js';
import type { CreateCommunityPayload, UpdateCommunityPayload } from '../../../../shared/types/group.js';

export class CommunityRepository {

  async create(data: CreateCommunityPayload & { createdBy: string }): Promise<ICommunity> {
    return CommunityModel.create({
      name:        data.name,
      description: data.description,
      handle:      data.handle?.toLowerCase(),
      type:        data.type,
      settings:    data.settings ?? {},
      categories:  data.categories ?? [],
      tags:        data.tags ?? [],
      createdBy:   new mongoose.Types.ObjectId(data.createdBy),
      memberCount: 1,
      groupCount:  0,
    });
  }

  async findById(id: string): Promise<ICommunity | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return CommunityModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }

  async findByHandle(handle: string): Promise<ICommunity | null> {
    return CommunityModel.findOne({ handle: handle.toLowerCase(), deletedAt: null }).exec();
  }

  async findMany(opts: { page: number; limit: number; q?: string; type?: string }): Promise<{ communities: ICommunity[]; total: number }> {
    const skip   = (opts.page - 1) * opts.limit;
    const filter: Record<string, unknown> = { status: 'active', deletedAt: null };
    if (opts.type) filter['type'] = opts.type;
    if (opts.q)    filter['$text'] = { $search: opts.q };
    const [communities, total] = await Promise.all([
      CommunityModel.find(filter).sort({ memberCount: -1 }).skip(skip).limit(opts.limit).exec(),
      CommunityModel.countDocuments(filter).exec(),
    ]);
    return { communities, total };
  }

  async findByUser(userId: string, opts: { page: number; limit: number }): Promise<{ communities: ICommunity[]; total: number }> {
    const userOid = new mongoose.Types.ObjectId(userId);
    const skip    = (opts.page - 1) * opts.limit;
    const memberships = await CommunityMemberModel.find({ userId: userOid, leftAt: null }).select('communityId').lean().exec();
    const ids = memberships.map((m) => m.communityId);
    const filter = { _id: { $in: ids }, deletedAt: null };
    const [communities, total] = await Promise.all([
      CommunityModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(opts.limit).exec(),
      CommunityModel.countDocuments(filter).exec(),
    ]);
    return { communities, total };
  }

  async update(id: string, data: UpdateCommunityPayload): Promise<ICommunity | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const $set: Record<string, unknown> = {};
    if (data.name        !== undefined) $set['name']        = data.name;
    if (data.description !== undefined) $set['description'] = data.description;
    if (data.handle      !== undefined) $set['handle']      = data.handle?.toLowerCase();
    if (data.rules       !== undefined) $set['rules']       = data.rules;
    if (data.type        !== undefined) $set['type']        = data.type;
    if (data.categories  !== undefined) $set['categories']  = data.categories;
    if (data.tags        !== undefined) $set['tags']        = data.tags;
    if (data.settings) {
      for (const [k, v] of Object.entries(data.settings)) {
        $set[`settings.${k}`] = v;
      }
    }
    return CommunityModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), { $set }, { returnDocument: 'after' }).exec();
  }

  async softDelete(id: string): Promise<void> {
    await CommunityModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), {
      $set: { status: 'deleted', deletedAt: new Date() },
    }).exec();
  }

  // ——— Membership ———

  async findMember(communityId: string, userId: string): Promise<ICommunityMember | null> {
    return CommunityMemberModel.findOne({
      communityId: new mongoose.Types.ObjectId(communityId),
      userId:      new mongoose.Types.ObjectId(userId),
      leftAt:      null,
    }).exec();
  }

  async addMember(data: { communityId: string; userId: string; role: ICommunityMember['role']; addedBy?: string }): Promise<ICommunityMember> {
    const doc = await CommunityMemberModel.create({
      communityId: new mongoose.Types.ObjectId(data.communityId),
      userId:      new mongoose.Types.ObjectId(data.userId),
      role:        data.role,
      addedBy:     data.addedBy ? new mongoose.Types.ObjectId(data.addedBy) : undefined,
      joinedAt:    new Date(),
    });
    await CommunityModel.findByIdAndUpdate(data.communityId, { $inc: { memberCount: 1 } }).exec();
    return doc;
  }

  async removeMember(communityId: string, userId: string): Promise<void> {
    await CommunityMemberModel.findOneAndUpdate(
      { communityId: new mongoose.Types.ObjectId(communityId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: { leftAt: new Date() } },
    ).exec();
    await CommunityModel.findByIdAndUpdate(communityId, { $inc: { memberCount: -1 } }).exec();
  }

  // ——— Groups in community ———

  async addGroup(communityId: string, groupId: string, addedBy: string): Promise<void> {
    await CommunityGroupModel.findOneAndUpdate(
      { communityId: new mongoose.Types.ObjectId(communityId), groupId: new mongoose.Types.ObjectId(groupId) },
      { $setOnInsert: { addedBy: new mongoose.Types.ObjectId(addedBy), position: 0 } },
      { upsert: true },
    ).exec();
    await CommunityModel.findByIdAndUpdate(communityId, { $inc: { groupCount: 1 } }).exec();
    await GroupModel.findByIdAndUpdate(groupId, { $set: { communityId: new mongoose.Types.ObjectId(communityId) } }).exec();
  }

  async removeGroup(communityId: string, groupId: string): Promise<void> {
    await CommunityGroupModel.findOneAndDelete({
      communityId: new mongoose.Types.ObjectId(communityId),
      groupId:     new mongoose.Types.ObjectId(groupId),
    }).exec();
    await CommunityModel.findByIdAndUpdate(communityId, { $inc: { groupCount: -1 } }).exec();
    await GroupModel.findByIdAndUpdate(groupId, { $unset: { communityId: '' } }).exec();
  }

  async getCommunityGroups(communityId: string): Promise<mongoose.Types.ObjectId[]> {
    const docs = await CommunityGroupModel.find({
      communityId: new mongoose.Types.ObjectId(communityId),
    }).sort({ position: 1 }).select('groupId').lean().exec();
    return docs.map((d) => d.groupId);
  }
}

export const communityRepository = new CommunityRepository();
