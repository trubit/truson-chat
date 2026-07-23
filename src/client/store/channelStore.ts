import { create } from 'zustand';
import type { ChannelSummary, GroupMessage } from '@shared/types';

interface ChannelState {
  channels: Map<string, ChannelSummary[]>; // groupId → channels
  messages: Map<string, GroupMessage[]>; // channelId → messages
  activeChannelId: string | null;
  typingUsers: Map<string, Set<string>>;
  unreadCounts: Map<string, number>;
  isLoading: boolean;
}

interface ChannelActions {
  setChannels: (groupId: string, channels: ChannelSummary[]) => void;
  upsertChannel: (channel: ChannelSummary) => void;
  removeChannel: (channelId: string, groupId: string) => void;
  setActiveChannel: (id: string | null) => void;
  addMessages: (channelId: string, messages: GroupMessage[], prepend?: boolean) => void;
  upsertMessage: (channelId: string, message: GroupMessage) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  incrementUnread: (channelId: string) => void;
  resetUnread: (channelId: string) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

type ChannelStore = ChannelState & ChannelActions;

const initial: ChannelState = {
  channels: new Map(),
  messages: new Map(),
  activeChannelId: null,
  typingUsers: new Map(),
  unreadCounts: new Map(),
  isLoading: false,
};

export const useChannelStore = create<ChannelStore>()((set, get) => ({
  ...initial,

  setChannels: (groupId, channels) => {
    const all = new Map(get().channels);
    all.set(groupId, channels);
    set({ channels: all });
  },

  upsertChannel: (channel) => {
    const all = new Map(get().channels);
    const existing = all.get(channel.groupId) ?? [];
    const idx = existing.findIndex((c) => c._id === channel._id);
    if (idx !== -1) existing[idx] = channel;
    else existing.push(channel);
    existing.sort((a, b) => a.position - b.position);
    all.set(channel.groupId, [...existing]);
    set({ channels: all });
  },

  removeChannel: (channelId, groupId) => {
    const all = new Map(get().channels);
    const existing = all.get(groupId) ?? [];
    all.set(
      groupId,
      existing.filter((c) => c._id !== channelId),
    );
    set({ channels: all });
  },

  setActiveChannel: (id) => set({ activeChannelId: id }),

  addMessages: (channelId, messages, prepend = false) => {
    const all = new Map(get().messages);
    const existing = all.get(channelId) ?? [];
    const deduped = prepend
      ? [...messages.filter((m) => !existing.some((e) => e._id === m._id)), ...existing]
      : [...existing, ...messages.filter((m) => !existing.some((e) => e._id === m._id))];
    all.set(channelId, deduped);
    set({ messages: all });
  },

  upsertMessage: (channelId, message) => {
    const all = new Map(get().messages);
    const existing = all.get(channelId) ?? [];
    const idx = existing.findIndex((m) => m._id === message._id);
    if (idx !== -1) existing[idx] = message;
    else existing.push(message);
    all.set(channelId, [...existing]);
    set({ messages: all });
  },

  deleteMessage: (channelId, messageId) => {
    const all = new Map(get().messages);
    const existing = all.get(channelId) ?? [];
    all.set(
      channelId,
      existing.map((m) =>
        m._id === messageId ? { ...m, status: 'deleted' as const, content: '' } : m,
      ),
    );
    set({ messages: all });
  },

  setTyping: (channelId, userId, isTyping) => {
    const all = new Map(get().typingUsers);
    const s = new Set(all.get(channelId) ?? []);
    if (isTyping) s.add(userId);
    else s.delete(userId);
    all.set(channelId, s);
    set({ typingUsers: all });
  },

  incrementUnread: (channelId) => {
    const counts = new Map(get().unreadCounts);
    counts.set(channelId, (counts.get(channelId) ?? 0) + 1);
    set({ unreadCounts: counts });
  },

  resetUnread: (channelId) => {
    const counts = new Map(get().unreadCounts);
    counts.set(channelId, 0);
    set({ unreadCounts: counts });
  },

  setLoading: (v) => set({ isLoading: v }),
  reset: () => set(initial),
}));
