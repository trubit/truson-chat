import { useEffect, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useConversationStore, type ConversationWithMeta } from '@/store/conversationStore';
import { useMessageStore } from '@/store/messageStore';
import { useTypingStore } from '@/store/typingStore';
import type { Message, SendMessagePayload } from '@shared/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

// Singleton socket — persists across component re-renders
let chatSocketInstance: Socket | null = null;

export function useChatSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { setConnected, setConnecting, setSocketId, resetReconnect } = useSocketStore();
  const { upsertConversation, updateLastMessage, incrementUnread } = useConversationStore();
  const { appendMessage, updateMessage, deleteMessage } = useMessageStore();
  const { setTyping, clearTyping } = useTypingStore();

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

    // Connection events
    const onConnect = () => {
      setConnected(true);
      setConnecting(false);
      setSocketId(socket.id ?? null);
      resetReconnect();
    };

    const onDisconnect = () => {
      setConnected(false);
      setSocketId(null);
    };

    const onConnectError = () => {
      setConnecting(false);
    };

    // Message events
    const onMessageNew = (message: Message) => {
      appendMessage(message);
      updateLastMessage(message.conversationId, {
        messageId: message._id,
        content: message.content,
        senderId: message.senderId,
        type: message.type,
        timestamp: message.createdAt,
      });
      const myId = useAuthStore.getState().user?._id;
      if (message.senderId !== myId) {
        incrementUnread(message.conversationId);
      }
    };

    const onMessageUpdated = (payload: Partial<Message> & { _id: string; conversationId: string }) => {
      updateMessage(payload);
    };

    const onMessageDeleted = (payload: { messageId: string; conversationId: string }) => {
      deleteMessage(payload.messageId, payload.conversationId);
    };

    const onMessageReaction = (payload: { messageId: string; conversationId: string; reactions?: Message['reactions'] }) => {
      updateMessage({
        _id: payload.messageId,
        conversationId: payload.conversationId,
        ...(payload.reactions ? { reactions: payload.reactions } : {}),
      });
    };

    // Typing events
    const onTypingStart = (payload: { conversationId: string; userId: string }) => {
      setTyping(payload.conversationId, payload.userId);
    };

    const onTypingStop = (payload: { conversationId: string; userId: string }) => {
      clearTyping(payload.conversationId, payload.userId);
    };

    // Conversation events
    const onConversationCreated = (conv: ConversationWithMeta) => {
      upsertConversation(conv);
    };

    const onConversationUpdated = (conv: Partial<ConversationWithMeta> & { _id: string }) => {
      const existing = useConversationStore.getState().conversations.get(conv._id);
      if (existing) {
        upsertConversation({ ...existing, ...conv });
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

    if (!socket.connected) {
      setConnecting(true);
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
    };
  }, [
    isAuthenticated,
    accessToken,
    setConnected,
    setConnecting,
    setSocketId,
    resetReconnect,
    upsertConversation,
    updateLastMessage,
    incrementUnread,
    appendMessage,
    updateMessage,
    deleteMessage,
    setTyping,
    clearTyping,
  ]);

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

  return { sendMessage, sendTypingStart, sendTypingStop, sendRead };
}

export function disconnectChatSocket() {
  if (chatSocketInstance) {
    chatSocketInstance.disconnect();
    chatSocketInstance = null;
  }
}
