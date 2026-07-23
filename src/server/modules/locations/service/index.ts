import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { SharedLocationRepository } from '../repository/index.js';
import type { ShareLocationDto, SharedLocationResponse } from '../types/index.js';
import type { ISharedLocation } from '../../../database/models/SharedLocation.js';

function toResponse(doc: ISharedLocation): SharedLocationResponse {
  return {
    _id: doc._id.toString(),
    sharedBy: doc.sharedBy.toString(),
    conversationId: doc.conversationId.toString(),
    latitude: doc.latitude,
    longitude: doc.longitude,
    accuracy: doc.accuracy,
    altitude: doc.altitude,
    name: doc.name,
    address: doc.address,
    isLive: doc.isLive,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class SharedLocationService {
  constructor(private repo: SharedLocationRepository) {}

  async share(userId: string, dto: ShareLocationDto): Promise<SharedLocationResponse> {
    if (!mongoose.Types.ObjectId.isValid(dto.conversationId)) {
      throw new AppError('Invalid conversationId', 400, 'VALIDATION_ERROR');
    }

    const doc = await this.repo.create({
      sharedBy: new mongoose.Types.ObjectId(userId),
      conversationId: new mongoose.Types.ObjectId(dto.conversationId),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      altitude: dto.altitude,
      name: dto.name,
      address: dto.address,
      isLive: false,
    });

    return toResponse(doc);
  }

  async getById(id: string): Promise<SharedLocationResponse> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new AppError('Location not found', 404, 'NOT_FOUND');
    return toResponse(doc);
  }
}

export const sharedLocationService = new SharedLocationService(new SharedLocationRepository());
