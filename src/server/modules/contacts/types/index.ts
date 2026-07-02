export type ContactCategory = 'general' | 'work' | 'family' | 'friend' | 'other';

export interface IContactWithUser {
  id: string;
  contactUserId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  notes?: string;
  category: ContactCategory;
  labels: string[];
  isFavorite: boolean;
  addedVia: string;
  createdAt: string;
}

export interface CreateContactDto {
  userId: string;
  displayName?: string;
  notes?: string;
  category?: ContactCategory;
  labels?: string[];
}

export interface UpdateContactDto {
  displayName?: string | null;
  notes?: string | null;
  category?: ContactCategory;
  labels?: string[];
}

export interface ContactListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: ContactCategory;
  isFavorite?: boolean;
  sort?: 'displayName' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface ContactListResult {
  contacts: IContactWithUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
