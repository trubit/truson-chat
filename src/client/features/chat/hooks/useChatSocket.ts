import { useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useConversationStore, type ConversationWithMeta } from '@/store/conversationStore';
import { useMessageStore } from '@/store/messageStore';
import { usePresenceStore } from '@/store/presenceStore';
import { useTypingStore } from '@/store/typingStore';
import { useGroupStore } from '@/store/groupStore';
import type { Message, SendMessagePayload } from '@shared/types';
import type { GroupMessage } from '@shared/types';
import type { PresenceStatus } from '@shared/types/social';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

// Singleton socket — persists across component re-renders
let chatSocketInstance: Socket | null = null;

export function useChatSocket() {
  // Only subscribe to auth state — everything else is accessed via getState() inside the effect
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Create socket if it doesn't exist
    if (!chatSocketInstance) {
      chatSocketInstance = io(`${SOCKET_URL}/chat`, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        autoConnect: false,
      });
    }

    const socket = chatSocketInstance;

    // Connection events — use getState() to avoid store subscriptions
    const onConnect = () => {
      useSocketStore.getState().setConnected(true);
      useSocketStore.getState().setConnecting(false);
      useSocketStore.getState().setSocketId(socket.id ?? null);
      useSocketStore.getState().resetReconnect();
    };

    const onDisconnect = () => {
      useSocketStore.getState().setConnected(false);
      useSocketStore.getState().setSocketId(null);
    };

    const onConnectError = () => {
      useSocketStore.getState().setConnecting(false);
    };

    // Message events
    const onMessageNew = (message: Message) => {
      useMessageStore.getState().appendMessage(message);
      useConversationStore.getState().updateLastMessage(message.conversationId, {
        messageId: message._id,
        content: message.content,
        senderId: message.senderId,
        type: message.type,
        timestamp: message.createdAt,
      });
      const myId = useAuthStore.getState().user?._id;
      if (message.senderId !== myId) {
        useConversationStore.getState().incrementUnread(message.conversationId);
      }
    };

    const onMessageUpdated = (
      payload: Partial<Message> & { _id: string; conversationId: string },
    ) => {
      useMessageStore.getState().updateMessage(payload);
    };

    const onMessageDeleted = (payload: { messageId: string; conversationId: string }) => {
      useMessageStore.getState().deleteMessage(payload.messageId, payload.conversationId);
    };

    const onMessageReaction = (payload: {
      messageId: string;
      conversationId: string;
      reactions?: Message['reactions'];
    }) => {
      useMessageStore.getState().updateMessage({
        _id: payload.messageId,
        conversationId: payload.conversationId,
        ...(payload.reactions ? { reactions: payload.reactions } : {}),
      });
    };

    // Typing events
    const onTypingStart = (payload: { conversationId: string; userId: string }) => {
      useTypingStore.getState().setTyping(payload.conversationId, payload.userId);
    };

    const onTypingStop = (payload: { conversationId: string; userId: string }) => {
      useTypingStore.getState().clearTyping(payload.conversationId, payload.userId);
    };

    // Read receipts → update own message ticks to blue
    const onMessageRead = (payload: {
      conversationId: string;
      messageId: string;
      userId: string;
      readAt: string;
    }) => {
      const myId = useAuthStore.getState().user?._id;
      if (!myId || payload.userId === myId) return; // ignore self-read events
      useMessageStore.getState().markMessagesRead(payload.conversationId, payload.messageId, myId);
    };

    // Presence events
    const notifyOnline = (userId: string) => {
      const prev = usePresenceStore.getState().presences[userId];
      const wasOnline = prev?.status === 'online';
      usePresenceStore.getState().setPresence(userId, {
        userId,
        status: 'online',
        lastSeen: undefined,
      });
      if (wasOnline) return; // already knew they were online, skip toast
      // Only toast for direct contacts
      const conversations = useConversationStore.getState().conversations;
      const myId = useAuthStore.getState().user?._id;
      if (!myId || userId === myId) return;
      for (const conv of conversations.values()) {
        if (conv.type === 'direct' && conv.participants?.includes(userId)) {
          const profile = conv.memberProfiles?.find((p) => p.userId === userId);
          const name = profile?.displayName ?? profile?.username ?? 'A contact';
          toast(name + ' is now online', {
            icon: '🟢',
            duration: 3000,
            style: {
              background: '#0D1225',
              color: '#F1F5F9',
              border: '1px solid rgba(139,92,246,0.2)',
            },
          });
          break;
        }
      }
    };

    const onUserOnline = (payload: { userId: string }) => notifyOnline(payload.userId);

    const onUserOffline = (payload: { userId: string; lastSeen?: string }) => {
      usePresenceStore.getState().setPresence(payload.userId, {
        userId: payload.userId,
        status: 'offline',
        lastSeen: payload.lastSeen,
      });
    };

    const onPresenceUpdated = (payload: {
      userId: string;
      status: PresenceStatus;
      lastSeen?: string;
    }) => {
      if (payload.status === 'online') {
        notifyOnline(payload.userId);
      } else {
        usePresenceStore.getState().setPresence(payload.userId, {
          userId: payload.userId,
          status: payload.status,
          lastSeen: payload.lastSeen,
        });
      }
    };

    // Conversation events
    const onConversationCreated = (conv: ConversationWithMeta) => {
      useConversationStore.getState().upsertConversation(conv);
    };

    const onConversationUpdated = (conv: Partial<ConversationWithMeta> & { _id: string }) => {
      const existing = useConversationStore.getState().conversations.get(conv._id);
      if (existing) {
        useConversationStore.getState().upsertConversation({ ...existing, ...conv });
      }
    };

    // Global group message handler — keeps the conversation list updated for all groups
    // even when the user is not currently viewing a specific group chat.
    // useGroupSocket (inside GroupWindow) handles upsertMessage for the active group;
    // this handler covers everything else: lastMessageAt sort order + unread badge.
    const onGroupMessageNew = (msg: GroupMessage) => {
      const gs = useGroupStore.getState();
      gs.updateLastMessage(msg.groupId, msg.createdAt);
      const myId = useAuthStore.getState().user?._id;
      const isViewingGroup = window.location.pathname.endsWith(`/chat/g/${msg.groupId}`);
      if (myId && msg.senderId !== myId && !isViewingGroup) {
        gs.incrementUnread(msg.groupId);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('message:new', onMessageNew);
    socket.on('message:updated', onMessageUpdated);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:reaction', onMessageReaction);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('conversation:created', onConversationCreated);
    socket.on('conversation:updated', onConversationUpdated);
    socket.on('message:read', onMessageRead);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('presence:updated', onPresenceUpdated);
    socket.on('group:message:new', onGroupMessageNew);

    if (!socket.connected) {
      useSocketStore.getState().setConnecting(true);
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('message:new', onMessageNew);
      socket.off('message:updated', onMessageUpdated);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:reaction', onMessageReaction);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('conversation:created', onConversationCreated);
      socket.off('conversation:updated', onConversationUpdated);
      socket.off('message:read', onMessageRead);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('presence:updated', onPresenceUpdated);
      socket.off('group:message:new', onGroupMessageNew);
    };
  }, [isAuthenticated, accessToken]);

  const sendMessage = useCallback(
    (
      payload: SendMessagePayload,
    ): Promise<{ success: boolean; message?: Message; error?: string }> => {
      return new Promise((resolve) => {
        if (!chatSocketInstance?.connected) {
          resolve({ success: false, error: 'Not connected' });
          return;
        }
        chatSocketInstance.emit(
          'message:send',
          payload,
          (result: { success: boolean; message?: Message; error?: string }) => {
            resolve(result);
          },
        );
      });
    },
    [],
  );

  const sendTypingStart = useCallback((conversationId: string) => {
    chatSocketInstance?.emit('typing:start', { conversationId });
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    chatSocketInstance?.emit('typing:stop', { conversationId });
  }, []);

  const sendRead = useCallback((conversationId: string, messageId: string) => {
    chatSocketInstance?.emit('message:read', { conversationId, messageId });
  }, []);

  const sendDeleteMessage = useCallback(
    (messageId: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!chatSocketInstance?.connected) {
          resolve({ success: false, error: 'Not connected' });
          return;
        }
        chatSocketInstance.emit(
          'message:delete',
          { messageId },
          (result: { success: boolean; error?: string }) => {
            resolve(result);
          },
        );
      });
    },
    [],
  );

  const sendReactToMessage = useCallback(
    (
      messageId: string,
      emoji: string,
      conversationId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!chatSocketInstance?.connected) {
          resolve({ success: false, error: 'Not connected' });
          return;
        }
        chatSocketInstance.emit(
          'message:react',
          { messageId, emoji, conversationId },
          (result: { success: boolean; error?: string }) => {
            resolve(result);
          },
        );
      });
    },
    [],
  );

  return {
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    sendRead,
    sendDeleteMessage,
    sendReactToMessage,
  };
}

export function getChatSocket() {
  return chatSocketInstance;
}

export function disconnectChatSocket() {
  if (chatSocketInstance) {
    chatSocketInstance.disconnect();
    chatSocketInstance = null;
  }
}
