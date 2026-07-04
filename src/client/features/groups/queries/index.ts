import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { getChatSocket } from '@/features/chat/hooks/useChatSocket';
import { useGroupStore }        from '@/store/groupStore';
import { useCommunityStore }    from '@/store/communityStore';
import { useChannelStore }      from '@/store/channelStore';
import { useAnnouncementStore } from '@/store/announcementStore';
import type {
  GroupSummary, GroupDetail, GroupMessage, GroupMemberSummary,
  CommunitySummary, CommunityDetail, ChannelSummary, AnnouncementSummary,
  CreateGroupPayload, UpdateGroupPayload, SendGroupMessagePayload,
  CreateCommunityPayload, UpdateCommunityPayload, CreateChannelPayload, UpdateChannelPayload,
  CreateAnnouncementPayload, CreateInvitePayload, ReviewJoinRequestPayload,
  GroupInvitationSummary, GroupJoinRequestSummary,
} from '@shared/types';

interface Api<T> { success: boolean; data: T; }

// ============ GROUPS ============

export function useMyGroups() {
  const setGroups = useGroupStore((s) => s.setGroups);
  return useQuery({
    queryKey: ['groups', 'me'],
    queryFn: async () => {
      const res = await apiService.get<Api<{ groups: GroupSummary[]; total: number; hasMore: boolean }>>('/groups/me');
      setGroups(res.data.groups);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useDiscoverGroups(q?: string) {
  return useQuery({
    queryKey: ['groups', 'discover', q],
    queryFn: () =>
      apiService.get<Api<{ groups: GroupSummary[]; total: number }>>(`/groups/discover?limit=24${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    staleTime: 60_000,
  });
}

export function useGroup(groupId: string | null) {
  const setGroupDetail = useGroupStore((s) => s.setGroupDetail);
  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      const res = await apiService.get<Api<GroupDetail>>(`/groups/${groupId!}`);
      setGroupDetail(res.data);
      return res.data;
    },
    enabled: Boolean(groupId),
    staleTime: 60_000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const upsert = useGroupStore((s) => s.upsertGroup);
  return useMutation({
    mutationFn: (dto: CreateGroupPayload) =>
      apiService.post<Api<GroupDetail>>('/groups', dto),
    onSuccess: (res) => {
      upsert(res.data);
      void qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateGroupPayload) =>
      apiService.patch<Api<GroupDetail>>(`/groups/${groupId}`, dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useDeleteGroup(groupId: string) {
  const qc = useQueryClient();
  const removeGroup = useGroupStore((s) => s.removeGroup);
  return useMutation({
    mutationFn: () => apiService.del<Api<null>>(`/groups/${groupId}`),
    onSuccess: () => {
      removeGroup(groupId);
      void qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

export function useJoinGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.post<Api<null>>(`/groups/${groupId}/join`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
      void qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

export function useLeaveGroup(groupId: string) {
  const qc = useQueryClient();
  const removeGroup = useGroupStore((s) => s.removeGroup);
  return useMutation({
    mutationFn: () => apiService.post<Api<null>>(`/groups/${groupId}/leave`),
    onSuccess: () => {
      removeGroup(groupId);
      void qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

// ——— Group Messages ———

export function useGroupMessages(groupId: string | null, channelId?: string) {
  const addMessages = useGroupStore((s) => s.addMessages);
  const addChanMessages = useChannelStore((s) => s.addMessages);
  return useInfiniteQuery({
    queryKey: ['group-messages', groupId, channelId],
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams();
      if (channelId) qs.set('channelId', channelId);
      if (pageParam) qs.set('before', pageParam as string);
      const res = await apiService.get<Api<{ messages: GroupMessage[]; hasMore: boolean }>>(`/groups/${groupId!}/messages?${qs.toString()}`);
      if (channelId) addChanMessages(channelId, res.data.messages, true);
      else addMessages(groupId!, res.data.messages, true);
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.hasMore && page.messages.length > 0 ? page.messages[0]._id : undefined,
    enabled: Boolean(groupId),
  });
}

export function useSendGroupMessage() {
  const upsertMessage = useGroupStore((s) => s.upsertMessage);
  const updateLastMessage = useGroupStore((s) => s.updateLastMessage);
  return useMutation({
    mutationFn: (dto: SendGroupMessagePayload): Promise<GroupMessage> => {
      return new Promise((resolve, reject) => {
        const socket = getChatSocket();
        if (socket?.connected) {
          socket.emit(
            'group:message:send',
            dto,
            (result: { success: boolean; message?: GroupMessage; error?: string }) => {
              if (result.success && result.message) resolve(result.message);
              else reject(new Error(result.error ?? 'Failed to send message'));
            },
          );
        } else {
          // REST fallback when socket unavailable — sender sees it, others don't until refresh
          apiService.post<Api<GroupMessage>>(`/groups/${dto.groupId}/messages`, dto)
            .then((res) => resolve(res.data))
            .catch(reject);
        }
      });
    },
    onSuccess: (msg) => {
      // Immediately add to store so sender sees the message without waiting for the socket echo
      upsertMessage(msg.groupId, msg);
      updateLastMessage(msg.groupId, msg.createdAt);
    },
  });
}

// ——— Group Members ———

export function useGroupMembers(groupId: string | null) {
  const setMembers = useGroupStore((s) => s.setMembers);
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const res = await apiService.get<Api<{ members: GroupMemberSummary[]; total: number }>>(`/groups/${groupId!}/members`);
      setMembers(groupId!, res.data.members);
      return res.data;
    },
    enabled: Boolean(groupId),
    staleTime: 60_000,
  });
}

export function useUpdateMemberRole(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiService.patch<Api<GroupMemberSummary>>(`/groups/${groupId}/members/${userId}/role`, { role }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['group-members', groupId] }),
  });
}

export function useKickMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiService.del<Api<null>>(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['group-members', groupId] }),
  });
}

export function useAddMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiService.post<Api<GroupMemberSummary>>(`/groups/${groupId}/members/${userId}`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['group-members', groupId] });
      void qc.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}

export function useBanMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason, expiresAt }: { userId: string; reason?: string; expiresAt?: string }) =>
      apiService.post<Api<null>>(`/groups/${groupId}/members/${userId}/ban`, { reason, expiresAt }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['group-members', groupId] }),
  });
}

// ——— Invitations ———

export function useGroupInvitations(groupId: string | null) {
  return useQuery({
    queryKey: ['group-invitations', groupId],
    queryFn: () =>
      apiService.get<Api<GroupInvitationSummary[]>>(`/group-invitations?groupId=${groupId!}`),
    enabled: Boolean(groupId),
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateInvitePayload) =>
      apiService.post<Api<GroupInvitationSummary>>('/group-invitations', dto),
    onSuccess: (_res, vars) => void qc.invalidateQueries({ queryKey: ['group-invitations', vars.groupId] }),
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiService.post<Api<null>>(`/group-invitations/accept/${token}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['groups', 'me'] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, groupId: _groupId }: { inviteId: string; groupId: string }) =>
      apiService.del<Api<null>>(`/group-invitations/${inviteId}`),
    onSuccess: (_res, vars) => void qc.invalidateQueries({ queryKey: ['group-invitations', vars.groupId] }),
  });
}

// ——— Join Requests ———

export function useGroupJoinRequests(groupId: string | null) {
  return useQuery({
    queryKey: ['group-join-requests', groupId],
    queryFn: () =>
      apiService.get<Api<{ requests: GroupJoinRequestSummary[]; total: number }>>(`/group-join-requests?groupId=${groupId!}`),
    enabled: Boolean(groupId),
  });
}

export function useRequestToJoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, message }: { groupId: string; message?: string }) =>
      apiService.post<Api<GroupJoinRequestSummary>>('/group-join-requests', { groupId, message }),
    onSuccess: (_res, vars) => void qc.invalidateQueries({ queryKey: ['group-join-requests', vars.groupId] }),
  });
}

export function useReviewJoinRequest(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, action, rejectReason }: ReviewJoinRequestPayload) =>
      apiService.patch<Api<GroupJoinRequestSummary>>(`/group-join-requests/${requestId}/review`, { action, rejectReason }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['group-join-requests', groupId] }),
  });
}

// ============ COMMUNITIES ============

export function useMyCommunities() {
  const setCommunities = useCommunityStore((s) => s.setCommunities);
  return useQuery({
    queryKey: ['communities', 'me'],
    queryFn: async () => {
      const res = await apiService.get<Api<{ communities: CommunitySummary[]; total: number }>>('/communities/me');
      setCommunities(res.data.communities);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useDiscoverCommunities(q?: string) {
  return useQuery({
    queryKey: ['communities', 'discover', q],
    queryFn: () =>
      apiService.get<Api<{ communities: CommunitySummary[]; total: number }>>(`/communities/discover?limit=24${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    staleTime: 60_000,
  });
}

export function useCommunity(communityId: string | null) {
  const setDetail = useCommunityStore((s) => s.setCommunityDetail);
  return useQuery({
    queryKey: ['communities', communityId],
    queryFn: async () => {
      const res = await apiService.get<Api<CommunityDetail>>(`/communities/${communityId!}`);
      setDetail(res.data);
      return res.data;
    },
    enabled: Boolean(communityId),
    staleTime: 60_000,
  });
}

export function useCreateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCommunityPayload) =>
      apiService.post<Api<CommunityDetail>>('/communities', dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['communities', 'me'] }),
  });
}

export function useUpdateCommunity(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateCommunityPayload) =>
      apiService.patch<Api<CommunityDetail>>(`/communities/${communityId}`, dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['communities', communityId] }),
  });
}

export function useJoinCommunity(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.post<Api<null>>(`/communities/${communityId}/join`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['communities', communityId] });
      void qc.invalidateQueries({ queryKey: ['communities', 'me'] });
    },
  });
}

export function useLeaveCommunity(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.post<Api<null>>(`/communities/${communityId}/leave`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['communities', 'me'] });
    },
  });
}

// ============ CHANNELS ============

export function useChannels(groupId: string | null) {
  const setChannels = useChannelStore((s) => s.setChannels);
  return useQuery({
    queryKey: ['channels', groupId],
    queryFn: async () => {
      const res = await apiService.get<Api<ChannelSummary[]>>(`/groups/${groupId!}/channels`);
      setChannels(groupId!, res.data);
      return res.data;
    },
    enabled: Boolean(groupId),
    staleTime: 60_000,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateChannelPayload) =>
      apiService.post<Api<ChannelSummary>>('/channels', dto),
    onSuccess: (_res, vars) => void qc.invalidateQueries({ queryKey: ['channels', vars.groupId] }),
  });
}

export function useUpdateChannel(channelId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateChannelPayload) =>
      apiService.patch<Api<ChannelSummary>>(`/channels/${channelId}`, dto),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['channels', groupId] }),
  });
}

export function useDeleteChannel(channelId: string, groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.del<Api<null>>(`/channels/${channelId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['channels', groupId] }),
  });
}

// ============ ANNOUNCEMENTS ============

export function useAnnouncements(scope: string, scopeId: string | null) {
  const setAnnouncements = useAnnouncementStore((s) => s.setAnnouncements);
  const scopeKey = `${scope}:${scopeId}`;
  return useQuery({
    queryKey: ['announcements', scope, scopeId],
    queryFn: async () => {
      const param = scope === 'group' ? `groupId=${scopeId}` : scope === 'community' ? `communityId=${scopeId}` : `channelId=${scopeId}`;
      const res = await apiService.get<Api<{ announcements: AnnouncementSummary[]; total: number }>>(`/announcements?scope=${scope}&${param}`);
      setAnnouncements(scopeKey, res.data.announcements);
      return res.data;
    },
    enabled: Boolean(scopeId),
    staleTime: 60_000,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAnnouncementPayload) =>
      apiService.post<Api<AnnouncementSummary>>('/announcements', dto),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['announcements', vars.scope] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, scope: _scope }: { announcementId: string; scope: string }) =>
      apiService.del<Api<null>>(`/announcements/${announcementId}`),
    onSuccess: (_res, vars) => void qc.invalidateQueries({ queryKey: ['announcements', vars.scope] }),
  });
}
