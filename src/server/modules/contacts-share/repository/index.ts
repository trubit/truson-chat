import mongoose from 'mongoose';
import { SharedContactModel, type ISharedContact } from '../../../database/models/SharedContact.js';

export class SharedContactRepository {
  async create(data: Partial<ISharedContact>): Promise<ISharedContact> {
    return SharedContactModel.create(data);
  }

  async findById(id: string): Promise<ISharedContact | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return SharedContactModel.findById(new mongoose.Types.ObjectId(id)).exec();
  }
}

export const sharedContactRepository = new SharedContactRepository();
