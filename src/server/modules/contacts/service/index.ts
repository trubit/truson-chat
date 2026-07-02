import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/errorHandler.js';
import { UserModel } from '../../../database/models/User.js';
import { ProfileModel } from '../../../database/models/Profile.js';
import type { IContact } from '../../../database/models/Contact.js';
import type { ContactRepository } from '../repository/index.js';
import type {
  ContactListQuery,
  ContactListResult,
  CreateContactDto,
  IContactWithUser,
  UpdateContactDto,
} from '../types/index.js';

export class ContactsService {
  constructor(private readonly repo: ContactRepository) {}

  async addContact(requesterId: string, dto: CreateContactDto): Promise<IContactWithUser> {
    if (!mongoose.isValidObjectId(dto.userId)) {
      throw new AppError('Invalid user ID', 400, 'INVALID_USER_ID');
    }

    if (requesterId === dto.userId) {
      throw new AppError('Cannot add yourself as a contact', 400, 'CANNOT_ADD_SELF');
    }

    const targetUser = await UserModel.findById(dto.userId).exec();
    if (!targetUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const existing = await this.repo.findByOwnerAndContact(requesterId, dto.userId);
    if (existing) {
      throw new AppError('Contact already exists', 409, 'CONTACT_ALREADY_EXISTS');
    }

    const contact = await this.repo.create({
      ownerId: requesterId,
      contactUserId: dto.userId,
      displayName: dto.displayName,
      notes: dto.notes,
      category: dto.category as 'general' | 'work' | 'family' | 'friend' | 'other' | undefined,
      labels: dto.labels,
      addedVia: 'manual' as const,
    });

    return this.populateContact(contact);
  }

  async getContacts(requesterId: string, query: ContactListQuery): Promise<ContactListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { contacts, total } = await this.repo.findManyByOwner(requesterId, query);

    // If search is provided, filter after population (search on username/displayName)
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      const populated = await Promise.all(contacts.map((c) => this.populateContact(c)));
      const filtered = populated.filter(
        (c) =>
          searchRegex.test(c.username) ||
          searchRegex.test(c.displayName) ||
          (c.notes && searchRegex.test(c.notes)),
      );
      return {
        contacts: filtered,
        meta: {
          page,
          limit,
          total: filtered.length,
          hasMore: false,
        },
      };
    }

    const populatedContacts = await Promise.all(contacts.map((c) => this.populateContact(c)));

    return {
      contacts: populatedContacts,
      meta: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  async getContact(requesterId: string, contactId: string): Promise<IContactWithUser> {
    if (!mongoose.isValidObjectId(contactId)) {
      throw new AppError('Invalid contact ID', 400, 'INVALID_CONTACT_ID');
    }

    const contact = await this.repo.findById(contactId);
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (contact.ownerId.toString() !== requesterId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    return this.populateContact(contact);
  }

  async updateContact(
    requesterId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<IContactWithUser> {
    if (!mongoose.isValidObjectId(contactId)) {
      throw new AppError('Invalid contact ID', 400, 'INVALID_CONTACT_ID');
    }

    const contact = await this.repo.findById(contactId);
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (contact.ownerId.toString() !== requesterId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const updated = await this.repo.update(contactId, dto);
    if (!updated) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    return this.populateContact(updated);
  }

  async removeContact(requesterId: string, contactId: string): Promise<void> {
    if (!mongoose.isValidObjectId(contactId)) {
      throw new AppError('Invalid contact ID', 400, 'INVALID_CONTACT_ID');
    }

    const contact = await this.repo.findById(contactId);
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (contact.ownerId.toString() !== requesterId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    await this.repo.delete(contactId);
  }

  async toggleFavorite(
    requesterId: string,
    contactId: string,
  ): Promise<{ isFavorite: boolean }> {
    if (!mongoose.isValidObjectId(contactId)) {
      throw new AppError('Invalid contact ID', 400, 'INVALID_CONTACT_ID');
    }

    const contact = await this.repo.findById(contactId);
    if (!contact) {
      throw new AppError('Contact not found', 404, 'CONTACT_NOT_FOUND');
    }

    if (contact.ownerId.toString() !== requesterId) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    const newValue = !contact.isFavorite;
    await this.repo.setFavorite(contactId, newValue);
    return { isFavorite: newValue };
  }

  async searchContacts(requesterId: string, searchTerm: string): Promise<IContactWithUser[]> {
    const contacts = await this.repo.searchByOwner(requesterId, searchTerm);
    return Promise.all(contacts.map((c) => this.populateContact(c)));
  }

  async exportContacts(requesterId: string): Promise<IContactWithUser[]> {
    const contacts = await this.repo.getAllByOwner(requesterId);
    return Promise.all(contacts.map((c) => this.populateContact(c)));
  }

  async prepareImport(
    requesterId: string,
    userIds: string[],
  ): Promise<{
    toAdd: string[];
    alreadyAdded: string[];
    notFound: string[];
    invalid: string[];
  }> {
    const invalid: string[] = [];
    const validIds: string[] = [];

    for (const id of userIds) {
      if (!mongoose.isValidObjectId(id)) {
        invalid.push(id);
      } else {
        validIds.push(id);
      }
    }

    const existingContactUserIds = await this.repo.getContactUserIds(requesterId);
    const existingSet = new Set(existingContactUserIds);

    const toAdd: string[] = [];
    const alreadyAdded: string[] = [];
    const notFound: string[] = [];

    for (const id of validIds) {
      if (existingSet.has(id)) {
        alreadyAdded.push(id);
        continue;
      }

      const user = await UserModel.findById(id).exec();
      if (!user) {
        notFound.push(id);
      } else {
        toAdd.push(id);
      }
    }

    return { toAdd, alreadyAdded, notFound, invalid };
  }

  private async populateContact(contact: IContact): Promise<IContactWithUser> {
    const [user, profile] = await Promise.all([
      UserModel.findById(contact.contactUserId).exec(),
      ProfileModel.findOne({ userId: contact.contactUserId }).exec(),
    ]);

    const username = user?.username ?? '';
    const profileDisplayName = profile?.displayName;
    const displayName = contact.displayName ?? profileDisplayName ?? username;
    const avatar = profile?.avatar?.url;
    const bio = profile?.bio;

    return {
      id: contact._id.toString(),
      contactUserId: contact.contactUserId.toString(),
      username,
      displayName,
      avatar,
      bio,
      notes: contact.notes,
      category: contact.category,
      labels: contact.labels,
      isFavorite: contact.isFavorite,
      addedVia: contact.addedVia,
      createdAt: contact.createdAt.toISOString(),
    };
  }
}
