import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { SharedContactRepository } from '../repository/index.js';
import type { CreateSharedContactDto, SharedContactResponse } from '../types/index.js';
import type { ISharedContact } from '../../../database/models/SharedContact.js';

function toResponse(doc: ISharedContact): SharedContactResponse {
  return {
    _id: doc._id.toString(),
    sharedBy: doc.sharedBy.toString(),
    conversationId: doc.conversationId.toString(),
    displayName: doc.displayName,
    phones: doc.phones,
    emails: doc.emails,
    avatar: doc.avatar,
    note: doc.note,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class SharedContactService {
  constructor(private repo: SharedContactRepository) {}

  async create(userId: string, dto: CreateSharedContactDto): Promise<SharedContactResponse> {
    if (!mongoose.Types.ObjectId.isValid(dto.conversationId)) {
      throw new AppError('Invalid conversationId', 400, 'VALIDATION_ERROR');
    }

    const doc = await this.repo.create({
      sharedBy: new mongoose.Types.ObjectId(userId),
      conversationId: new mongoose.Types.ObjectId(dto.conversationId),
      displayName: dto.displayName,
      phones: dto.phones,
      emails: dto.emails ?? [],
      avatar: dto.avatar,
      note: dto.note,
    });

    return toResponse(doc);
  }

  async getById(id: string): Promise<SharedContactResponse> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new AppError('Shared contact not found', 404, 'NOT_FOUND');
    return toResponse(doc);
  }
}

export const sharedContactService = new SharedContactService(new SharedContactRepository());
