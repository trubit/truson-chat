import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import {
  GroupModel,     type IGroup,
  GroupMemberModel, type IGroupMember,
  GroupMessageModel, type IGroupMessage,
  GroupMessageReadModel,
} from '../../../database/models/index.js';
import type { CreateGroupDto, UpdateGroupDto, GroupQuery, GroupMessageQuery, SendGroupMessageDto } from '../types/index.js';

// ---------------------------------------------------------------------------
// GroupRepository — all Mongoose queries for groups
// ---------------------------------------------------------------------------

export class GroupRepository {

  // ——— Groups ———

  async create(data: CreateGroupDto & { createdBy: string }): Promise<IGroup> {
    const doc = await GroupModel.create({
      name:        data.name,
      description: data.description,
      handle:      data.handle,
      type:        data.type,
      communityId: data.communityId ? new mongoose.Types.ObjectId(data.communityId) : undefined,
      maxMembers:  data.maxMembers ?? 1024,
      settings:    data.settings ?? {},
      categories:  data.categories ?? [],
      tags:        data.tags ?? [],
      createdBy:   new mongoose.Types.ObjectId(data.createdBy),
      inviteLink:  randomUUID(),
      memberCount: 1,
    });
    return doc;
  }

  async findById(id: string): Promise<IGroup | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return GroupModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }

  async findByHandle(handle: string): Promise<IGroup | null> {
    return GroupModel.findOne({ handle: handle.toLowerCase(), deletedAt: null }).exec();
  }

  async findByInviteLink(token: string): Promise<IGroup | null> {
    return GroupModel.findOne({ inviteLink: token, deletedAt: null }).exec();
  }

  async findMany(query: GroupQuery): Promise<{ groups: IGroup[]; total: number }> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;
    const skip  = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };
    if (query.type)   filter['type']   = query.type;
    if (query.status) filter['status'] = query.status;
    if (query.q)      filter['$text']  = { $search: query.q };

    const [groups, total] = await Promise.all([
      GroupModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      GroupModel.countDocuments(filter).exec(),
    ]);
    return { groups, total };
  }

  async findByUser(userId: string, opts: { page: number; limit: number }): Promise<{ groups: IGroup[]; total: number }> {
    const skip  = (opts.page - 1) * opts.limit;
    const userOid = new mongoose.Types.ObjectId(userId);

    const memberships = await GroupMemberModel.find({ userId: userOid, status: 'active' })
      .select('groupId').lean().exec();
    const groupIds = memberships.map((m) => m.groupId);

    const filter = { _id: { $in: groupIds }, deletedAt: null };
    const [groups, total] = await Promise.all([
      GroupModel.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(opts.limit).exec(),
      GroupModel.countDocuments(filter).exec(),
    ]);
    return { groups, total };
  }

  async update(id: string, data: UpdateGroupDto): Promise<IGroup | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const $set: Record<string, unknown> = {};
    if (data.name        !== undefined) $set['name']        = data.name;
    if (data.description !== undefined) $set['description'] = data.description;
    if (data.handle      !== undefined) $set['handle']      = data.handle?.toLowerCase();
    if (data.type        !== undefined) $set['type']        = data.type;
    if (data.maxMembers  !== undefined) $set['maxMembers']  = data.maxMembers;
    if (data.categories  !== undefined) $set['categories']  = data.categories;
    if (data.tags        !== undefined) $set['tags']        = data.tags;
    if (data.settings) {
      for (const [k, v] of Object.entries(data.settings)) {
        $set[`settings.${k}`] = v;
      }
    }
    return GroupModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set },
      { returnDocument: 'after' },
    ).exec();
  }

  async resetInviteLink(id: string): Promise<IGroup | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return GroupModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set: { inviteLink: randomUUID(), inviteLinkExpiry: null } },
      { returnDocument: 'after' },
    ).exec();
  }

  async softDelete(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await GroupModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), {
      $set: { status: 'deleted', deletedAt: new Date() },
    }).exec();
  }

  async incrementMemberCount(id: string, delta: number): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await GroupModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), {
      $inc: { memberCount: delta },
    }).exec();
  }

  // ——— Members ———

  async findMember(groupId: string, userId: string): Promise<IGroupMember | null> {
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) return null;
    return GroupMemberModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId:  new mongoose.Types.ObjectId(userId),
    }).exec();
  }

  async addMember(data: {
    groupId: string; userId: string; role: IGroupMember['role']; addedBy?: string;
  }): Promise<IGroupMember> {
    const doc = await GroupMemberModel.create({
      groupId: new mongoose.Types.ObjectId(data.groupId),
      userId:  new mongoose.Types.ObjectId(data.userId),
      role:    data.role,
      addedBy: data.addedBy ? new mongoose.Types.ObjectId(data.addedBy) : undefined,
      status:  'active',
      joinedAt: new Date(),
    });
    return doc;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await GroupMemberModel.findOneAndUpdate(
      {
        groupId: new mongoose.Types.ObjectId(groupId),
        userId:  new mongoose.Types.ObjectId(userId),
      },
      { $set: { status: 'left', leftAt: new Date() } },
    ).exec();
  }

  // ——— Messages ———

  async createMessage(data: SendGroupMessageDto & { senderId: string }): Promise<IGroupMessage> {
    const doc = await GroupMessageModel.create({
      groupId:   new mongoose.Types.ObjectId(data.groupId),
      channelId: data.channelId ? new mongoose.Types.ObjectId(data.channelId) : undefined,
      senderId:  new mongoose.Types.ObjectId(data.senderId),
      type:      data.type ?? 'text',
      content:   data.content,
      replyTo:   data.replyTo ? new mongoose.Types.ObjectId(data.replyTo) : undefined,
      mentions:  (data.mentions ?? []).map((m) => ({ ...m, userId: new mongoose.Types.ObjectId(m.userId) })),
      media:     data.media ?? [],
    });
    await GroupModel.findByIdAndUpdate(data.groupId, { $set: { lastMessageAt: new Date() } }).exec();
    return doc;
  }

  async findMessages(query: GroupMessageQuery): Promise<{ messages: IGroupMessage[]; hasMore: boolean }> {
    const limit = (query.limit ?? 30) + 1;
    const filter: Record<string, unknown> = {
      groupId:   new mongoose.Types.ObjectId(query.groupId),
      deletedAt: null,
    };
    if (query.channelId) filter['channelId'] = new mongoose.Types.ObjectId(query.channelId);

    let sortDir: 1 | -1 = -1;
    if (query.before && mongoose.Types.ObjectId.isValid(query.before)) {
      filter['_id'] = { $lt: new mongoose.Types.ObjectId(query.before) };
    } else if (query.after && mongoose.Types.ObjectId.isValid(query.after)) {
      filter['_id'] = { $gt: new mongoose.Types.ObjectId(query.after) };
      sortDir = 1;
    }

    const docs = await GroupMessageModel.find(filter)
      .sort({ _id: sortDir })
      .limit(limit)
      .populate('senderId', 'username')
      .exec();

    const hasMore = docs.length > (query.limit ?? 30);
    const messages = hasMore ? docs.slice(0, query.limit ?? 30) : docs;
    if (sortDir === -1) messages.reverse();
    return { messages, hasMore };
  }

  async findMessageById(id: string): Promise<IGroupMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return GroupMessageModel.findById(new mongoose.Types.ObjectId(id))
      .populate('senderId', 'username')
      .exec();
  }

  async editMessage(id: string, content: string): Promise<IGroupMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return GroupMessageModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set: { content, isEdited: true, editedAt: new Date() } },
      { returnDocument: 'after' },
    ).exec();
  }

  async softDeleteMessage(id: string, deletedBy: string): Promise<IGroupMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return GroupMessageModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { $set: { status: 'deleted', content: '', media: [], deletedAt: new Date(), deletedBy: new mongoose.Types.ObjectId(deletedBy) } },
      { returnDocument: 'after' },
    ).exec();
  }

  async toggleReaction(messageId: string, emoji: string, userId: string): Promise<{ message: IGroupMessage; action: 'add' | 'remove'; count: number }> {
    const userOid = new mongoose.Types.ObjectId(userId);
    const msg = await GroupMessageModel.findById(new mongoose.Types.ObjectId(messageId)).exec();
    if (!msg) throw new Error('Message not found');

    const idx = msg.reactions.findIndex((r) => r.emoji === emoji);
    let action: 'add' | 'remove' = 'add';

    if (idx === -1) {
      msg.reactions.push({ emoji, users: [userOid], count: 1 });
    } else {
      const r = msg.reactions[idx];
      const uIdx = r.users.findIndex((u) => u.equals(userOid));
      if (uIdx !== -1) {
        r.users.splice(uIdx, 1);
        r.count = Math.max(0, r.count - 1);
        if (r.count === 0) msg.reactions.splice(idx, 1);
        action = 'remove';
      } else {
        r.users.push(userOid);
        r.count += 1;
      }
    }

    await msg.save();
    const count = msg.reactions.find((r) => r.emoji === emoji)?.count ?? 0;
    return { message: msg, action, count };
  }

  async markRead(groupId: string, userId: string, lastMessageId: string): Promise<void> {
    await GroupMessageReadModel.findOneAndUpdate(
      { groupId: new mongoose.Types.ObjectId(groupId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: { lastMessageId: new mongoose.Types.ObjectId(lastMessageId), lastReadAt: new Date() } },
      { upsert: true },
    ).exec();
  }

  async countUnread(groupId: string, userId: string): Promise<number> {
    const read = await GroupMessageReadModel.findOne({
      groupId: new mongoose.Types.ObjectId(groupId),
      userId:  new mongoose.Types.ObjectId(userId),
    }).lean().exec();

    const filter: Record<string, unknown> = {
      groupId: new mongoose.Types.ObjectId(groupId),
      senderId: { $ne: new mongoose.Types.ObjectId(userId) },
      deletedAt: null,
    };
    if (read?.lastMessageId) {
      filter['_id'] = { $gt: read.lastMessageId };
    }
    return GroupMessageModel.countDocuments(filter).exec();
  }

  async pinMessage(messageId: string, pin: boolean): Promise<IGroupMessage | null> {
    if (!mongoose.Types.ObjectId.isValid(messageId)) return null;
    return GroupMessageModel.findByIdAndUpdate(
      new mongoose.Types.ObjectId(messageId),
      { $set: { isPinned: pin } },
      { returnDocument: 'after' },
    ).exec();
  }

  async findPinned(groupId: string): Promise<IGroupMessage[]> {
    return GroupMessageModel.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      isPinned: true,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }
}

export const groupRepository = new GroupRepository();
