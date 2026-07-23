import mongoose from 'mongoose';
import {
  SharedLocationModel,
  type ISharedLocation,
} from '../../../database/models/SharedLocation.js';

export class SharedLocationRepository {
  async create(data: Partial<ISharedLocation>): Promise<ISharedLocation> {
    return SharedLocationModel.create(data);
  }

  async findById(id: string): Promise<ISharedLocation | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return SharedLocationModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }
}

export const sharedLocationRepository = new SharedLocationRepository();
