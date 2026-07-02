import { create } from 'zustand';
import type { IContactWithUser, ContactListQuery } from '@shared/types/social';

interface ContactsMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface ContactsState {
  contacts: IContactWithUser[];
  meta: ContactsMeta;
  query: ContactListQuery;
  selectedContactId: string | null;
  isLoading: boolean;
}

interface ContactsActions {
  setContacts: (contacts: IContactWithUser[], meta: ContactsMeta) => void;
  addContact: (contact: IContactWithUser) => void;
  updateContact: (id: string, data: Partial<IContactWithUser>) => void;
  removeContact: (id: string) => void;
  setQuery: (query: Partial<ContactListQuery>) => void;
  setSelectedContact: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type ContactsStore = ContactsState & ContactsActions;

const initialMeta: ContactsMeta = { page: 1, limit: 20, total: 0, hasMore: false };

export const useContactsStore = create<ContactsStore>((set) => ({
  contacts: [],
  meta: initialMeta,
  query: {},
  selectedContactId: null,
  isLoading: false,

  setContacts: (contacts, meta) => set({ contacts, meta }),

  addContact: (contact) =>
    set((state) => ({
      contacts: [contact, ...state.contacts],
      meta: { ...state.meta, total: state.meta.total + 1 },
    })),

  updateContact: (id, data) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      ),
    })),

  removeContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
      meta: { ...state.meta, total: Math.max(0, state.meta.total - 1) },
      selectedContactId:
        state.selectedContactId === id ? null : state.selectedContactId,
    })),

  setQuery: (query) =>
    set((state) => ({ query: { ...state.query, ...query } })),

  setSelectedContact: (selectedContactId) => set({ selectedContactId }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({ contacts: [], meta: initialMeta, query: {}, selectedContactId: null, isLoading: false }),
}));
