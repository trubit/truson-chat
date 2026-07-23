import { create } from 'zustand';
import type { GroupSummary, GroupDetail, GroupMessage, GroupMemberSummary } from '@shared/types';

interface GroupState {
  groups: Map<string, GroupSummary>;
  orderedIds: string[]; // sorted by lastMessageAt desc
  activeGroupId: string | null;
  groupDetails: Map<string, GroupDetail>;
  messages: Map<string, GroupMessage[]>; // groupId → messages
  members: Map<string, GroupMemberSummary[]>; // groupId → members
  typingUsers: Map<string, Set<string>>; // groupId → Set<userId>
  unreadCounts: Map<string, number>;
  isLoading: boolean;
}

interface GroupActions {
  setGroups: (groups: GroupSummary[]) => void;
  upsertGroup: (group: GroupSummary) => void;
  removeGroup: (groupId: string) => void;
  setActiveGroup: (id: string | null) => void;
  setGroupDetail: (detail: GroupDetail) => void;
  addMessages: (groupId: string, messages: GroupMessage[], prepend?: boolean) => void;
  upsertMessage: (groupId: string, message: GroupMessage) => void;
  deleteMessage: (groupId: string, messageId: string) => void;
  setMembers: (groupId: string, members: GroupMemberSummary[]) => void;
  upsertMember: (groupId: string, member: GroupMemberSummary) => void;
  removeMember: (groupId: string, userId: string) => void;
  setTyping: (groupId: string, userId: string, isTyping: boolean) => void;
  incrementUnread: (groupId: string) => void;
  resetUnread: (groupId: string) => void;
  updateLastMessage: (groupId: string, lastMessageAt: string) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

type GroupStore = GroupState & GroupActions;

function sortedGroupIds(map: Map<string, GroupSummary>): string[] {
  return Array.from(map.values())
    .sort((a, b) => {
      const ta = a.lastMessageAt
        ? new Date(a.lastMessageAt).getTime()
        : new Date(a.createdAt).getTime();
      const tb = b.lastMessageAt
        ? new Date(b.lastMessageAt).getTime()
        : new Date(b.createdAt).getTime();
      return tb - ta;
    })
    .map((g) => g._id);
}

const initial: GroupState = {
  groups: new Map(),
  orderedIds: [],
  activeGroupId: null,
  groupDetails: new Map(),
  messages: new Map(),
  members: new Map(),
  typingUsers: new Map(),
  unreadCounts: new Map(),
  isLoading: false,
};

export const useGroupStore = create<GroupStore>()((set, get) => ({
  ...initial,

  setGroups: (groups) => {
    const map = new Map<string, GroupSummary>(groups.map((g) => [g._id, g]));
    set({ groups: map, orderedIds: sortedGroupIds(map) });
  },

  upsertGroup: (group) => {
    const groups = new Map(get().groups);
    groups.set(group._id, group);
    set({ groups, orderedIds: sortedGroupIds(groups) });
  },

  removeGroup: (groupId) => {
    const groups = new Map(get().groups);
    groups.delete(groupId);
    set({ groups, orderedIds: sortedGroupIds(groups) });
  },

  setActiveGroup: (id) => set({ activeGroupId: id }),

  setGroupDetail: (detail) => {
    const groupDetails = new Map(get().groupDetails);
    groupDetails.set(detail._id, detail);
    set({ groupDetails });
  },

  addMessages: (groupId, messages, prepend = false) => {
    const all = new Map(get().messages);
    const existing = all.get(groupId) ?? [];
    const deduped = prepend
      ? [...messages.filter((m) => !existing.some((e) => e._id === m._id)), ...existing]
      : [...existing, ...messages.filter((m) => !existing.some((e) => e._id === m._id))];
    all.set(groupId, deduped);
    set({ messages: all });
  },

  upsertMessage: (groupId, message) => {
    const all = new Map(get().messages);
    const existing = all.get(groupId) ?? [];
    const idx = existing.findIndex((m) => m._id === message._id);
    if (idx !== -1) {
      existing[idx] = message;
      all.set(groupId, [...existing]);
    } else {
      all.set(groupId, [...existing, message]);
    }
    set({ messages: all });
  },

  deleteMessage: (groupId, messageId) => {
    const all = new Map(get().messages);
    const existing = all.get(groupId) ?? [];
    all.set(
      groupId,
      existing.map((m) => (m._id === messageId ? { ...m, status: 'deleted', content: '' } : m)),
    );
    set({ messages: all });
  },

  setMembers: (groupId, members) => {
    const all = new Map(get().members);
    all.set(groupId, members);
    set({ members: all });
  },

  upsertMember: (groupId, member) => {
    const all = new Map(get().members);
    const existing = all.get(groupId) ?? [];
    const idx = existing.findIndex((m) => m.userId === member.userId);
    if (idx !== -1) existing[idx] = member;
    else existing.push(member);
    all.set(groupId, [...existing]);
    set({ members: all });
  },

  removeMember: (groupId, userId) => {
    const all = new Map(get().members);
    const existing = all.get(groupId) ?? [];
    all.set(
      groupId,
      existing.filter((m) => m.userId !== userId),
    );
    set({ members: all });
  },

  setTyping: (groupId, userId, isTyping) => {
    const all = new Map(get().typingUsers);
    const set2 = new Set(all.get(groupId) ?? []);
    if (isTyping) set2.add(userId);
    else set2.delete(userId);
    all.set(groupId, set2);
    set({ typingUsers: all });
  },

  incrementUnread: (groupId) => {
    const counts = new Map(get().unreadCounts);
    counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
    set({ unreadCounts: counts });
  },

  resetUnread: (groupId) => {
    const counts = new Map(get().unreadCounts);
    counts.set(groupId, 0);
    set({ unreadCounts: counts });
  },

  updateLastMessage: (groupId, lastMessageAt) => {
    const groups = new Map(get().groups);
    const g = groups.get(groupId);
    if (g) {
      groups.set(groupId, { ...g, lastMessageAt });
      set({ groups, orderedIds: sortedGroupIds(groups) });
    }
  },

  setLoading: (v) => set({ isLoading: v }),
  reset: () => set(initial),
}));
