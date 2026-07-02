import mongoose from 'mongoose';
import { ContactModel, type IContact } from '../../../database/models/Contact.js';
import { UserModel } from '../../../database/models/User.js';
import type { ContactListQuery, UpdateContactDto } from '../types/index.js';

const ObjId = mongoose.Types.ObjectId;

export class ContactRepository {
  async findByOwnerAndContact(ownerId: string, contactUserId: string): Promise<IContact | null> {
    return ContactModel.findOne({
      ownerId: new ObjId(ownerId),
      contactUserId: new ObjId(contactUserId),
    }).exec();
  }

  async findById(id: string): Promise<IContact | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return ContactModel.findById(new ObjId(id)).exec();
  }

  async findManyByOwner(
    ownerId: string,
    query: ContactListQuery,
  ): Promise<{ contacts: IContact[]; total: number }> {
    const filter: Record<string, unknown> = { ownerId: new ObjId(ownerId) };

    if (query.isFavorite !== undefined) {
      filter['isFavorite'] = query.isFavorite;
    }
    if (query.category) {
      filter['category'] = query.category;
    }

    const sortField = query.sort === 'displayName' ? 'displayName' : 'createdAt';
    const sortOrder = query.order === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, contacts] = await Promise.all([
      ContactModel.countDocuments(filter).exec(),
      ContactModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
    ]);

    return { contacts, total };
  }

  async create(data: {
    ownerId: string;
    contactUserId: string;
    displayName?: string;
    notes?: string;
    category?: 'general' | 'work' | 'family' | 'friend' | 'other';
    labels?: string[];
    addedVia?: 'manual' | 'phone_sync' | 'email_sync' | 'qr_code';
  }): Promise<IContact> {
    const contact = await ContactModel.create({
      ownerId: new ObjId(data.ownerId),
      contactUserId: new ObjId(data.contactUserId),
      displayName: data.displayName,
      notes: data.notes,
      category: data.category ?? 'general',
      labels: data.labels ?? [],
      addedVia: data.addedVia ?? 'manual',
    });
    return contact;
  }

  async update(id: string, data: Partial<UpdateContactDto>): Promise<IContact | null> {
    if (!mongoose.isValidObjectId(id)) return null;

    const setFields: Record<string, unknown> = {};
    const unsetFields: Record<string, string> = {};

    if (data.displayName === null) {
      unsetFields['displayName'] = '';
    } else if (data.displayName !== undefined) {
      setFields['displayName'] = data.displayName;
    }

    if (data.notes === null) {
      unsetFields['notes'] = '';
    } else if (data.notes !== undefined) {
      setFields['notes'] = data.notes;
    }

    if (data.category !== undefined) {
      setFields['category'] = data.category;
    }
    if (data.labels !== undefined) {
      setFields['labels'] = data.labels;
    }

    const updateOp: Record<string, unknown> = {};
    if (Object.keys(setFields).length > 0) updateOp['$set'] = setFields;
    if (Object.keys(unsetFields).length > 0) updateOp['$unset'] = unsetFields;

    if (Object.keys(updateOp).length === 0) {
      return this.findById(id);
    }

    return ContactModel.findOneAndUpdate(
      { _id: new ObjId(id) },
      updateOp,
      { returnDocument: 'after', runValidators: true },
    ).exec();
  }

  async delete(id: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) return;
    await ContactModel.deleteOne({ _id: new ObjId(id) }).exec();
  }

  async searchByOwner(ownerId: string, searchTerm: string, limit = 20): Promise<IContact[]> {
    const regex = new RegExp(searchTerm, 'i');

    // Find matching user IDs
    const matchingUsers = await UserModel.find({ username: { $regex: regex } })
      .select('_id')
      .limit(100)
      .exec();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    return ContactModel.find({
      ownerId: new ObjId(ownerId),
      $or: [
        { contactUserId: { $in: matchingUserIds } },
        { displayName: { $regex: regex } },
      ],
    })
      .limit(limit)
      .exec();
  }

  async getFavorites(ownerId: string): Promise<IContact[]> {
    return ContactModel.find({ ownerId: new ObjId(ownerId), isFavorite: true }).exec();
  }

  async countByOwner(ownerId: string): Promise<number> {
    return ContactModel.countDocuments({ ownerId: new ObjId(ownerId) }).exec();
  }

  async getAllByOwner(ownerId: string): Promise<IContact[]> {
    return ContactModel.find({ ownerId: new ObjId(ownerId) }).exec();
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<IContact | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    return ContactModel.findOneAndUpdate(
      { _id: new ObjId(id) },
      { $set: { isFavorite } },
      { returnDocument: 'after' },
    ).exec();
  }

  async deleteAllByOwner(ownerId: string): Promise<void> {
    await ContactModel.deleteMany({ ownerId: new ObjId(ownerId) }).exec();
  }

  async getContactUserIds(ownerId: string): Promise<string[]> {
    const contacts = await ContactModel.find({ ownerId: new ObjId(ownerId) })
      .select('contactUserId')
      .exec();
    return contacts.map((c) => c.contactUserId.toString());
  }
}
