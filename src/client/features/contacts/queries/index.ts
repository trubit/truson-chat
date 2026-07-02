import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useContactsStore } from '@/store/contactsStore';
import type {
  ContactListQuery,
  ContactListResult,
  IContactWithUser,
  CreateContactDto,
  UpdateContactDto,
  ImportPrepResult,
} from '@shared/types/social';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CONTACT_KEYS = {
  all: ['contacts'] as const,
  list: (query?: ContactListQuery) => ['contacts', 'list', query] as const,
  single: (id: string) => ['contacts', id] as const,
  search: (q: string) => ['contacts', 'search', q] as const,
  export: ['contacts', 'export'] as const,
};

// ─── Response wrappers ────────────────────────────────────────────────────────

interface ContactListResponse {
  success: boolean;
  data: ContactListResult;
}

interface ContactResponse {
  success: boolean;
  data: IContactWithUser;
}

interface ContactsArrayResponse {
  success: boolean;
  data: IContactWithUser[];
}

interface FavoriteResponse {
  success: boolean;
  data: { isFavorite: boolean };
}

interface ImportPrepResponse {
  success: boolean;
  data: ImportPrepResult;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useContacts(query?: ContactListQuery) {
  const setContacts = useContactsStore((s) => s.setContacts);

  return useQuery({
    queryKey: CONTACT_KEYS.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.page) params.set('page', String(query.page));
      if (query?.limit) params.set('limit', String(query.limit));
      if (query?.search) params.set('search', query.search);
      if (query?.category) params.set('category', query.category);
      if (query?.isFavorite !== undefined) params.set('isFavorite', String(query.isFavorite));
      if (query?.sort) params.set('sort', query.sort);
      if (query?.order) params.set('order', query.order);

      const qs = params.toString();
      const res = await apiService.get<ContactListResponse>(
        `/contacts${qs ? `?${qs}` : ''}`,
      );
      setContacts(res.data.contacts, res.data.meta);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useContact(contactId: string) {
  return useQuery({
    queryKey: CONTACT_KEYS.single(contactId),
    queryFn: async () => {
      const res = await apiService.get<ContactResponse>(`/contacts/${contactId}`);
      return res.data;
    },
    enabled: Boolean(contactId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useContactSearch(q: string) {
  return useQuery({
    queryKey: CONTACT_KEYS.search(q),
    queryFn: async () => {
      const res = await apiService.get<ContactsArrayResponse>(
        `/contacts/search?q=${encodeURIComponent(q)}`,
      );
      return res.data;
    },
    enabled: q.length > 0,
    staleTime: 30 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useAddContact() {
  const queryClient = useQueryClient();
  const addContact = useContactsStore((s) => s.addContact);

  return useMutation({
    mutationFn: (dto: CreateContactDto) =>
      apiService.post<ContactResponse>('/contacts', dto),
    onSuccess: (res) => {
      addContact(res.data);
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const updateContact = useContactsStore((s) => s.updateContact);

  return useMutation({
    mutationFn: ({ contactId, dto }: { contactId: string; dto: UpdateContactDto }) =>
      apiService.patch<ContactResponse>(`/contacts/${contactId}`, dto),
    onSuccess: (res) => {
      updateContact(res.data.id, res.data);
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.single(res.data.id) });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();
  const removeContact = useContactsStore((s) => s.removeContact);

  return useMutation({
    mutationFn: (contactId: string) =>
      apiService.del<{ success: boolean }>(`/contacts/${contactId}`),
    onSuccess: (_, contactId) => {
      removeContact(contactId);
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.all });
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const updateContact = useContactsStore((s) => s.updateContact);

  return useMutation({
    mutationFn: (contactId: string) =>
      apiService.post<FavoriteResponse>(`/contacts/${contactId}/favorite`),
    onSuccess: (res, contactId) => {
      updateContact(contactId, { isFavorite: res.data.isFavorite });
      queryClient.invalidateQueries({ queryKey: CONTACT_KEYS.single(contactId) });
    },
  });
}

export function usePrepareImport() {
  return useMutation({
    mutationFn: (userIds: string[]) =>
      apiService.post<ImportPrepResponse>('/contacts/import/prepare', { userIds }),
    onSuccess: () => {
      // caller can trigger individual addContact mutations after reviewing
    },
  });
}
