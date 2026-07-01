import type { Message, SendMessagePayload, EditMessagePayload } from './message.js';
import type { Conversation } from './conversation.js';
import type { PublicUser } from './user.js';

// === SERVER → CLIENT EVENTS ===
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:updated': (message: Pick<Message, '_id' | 'conversationId' | 'content' | 'editedAt'>) => void;
  'message:deleted': (payload: { messageId: string; conversationId: string }) => void;
  'message:reaction': (payload: {
    messageId: string;
    conversationId: string;
    emoji: string;
    userId: string;
    action: 'add' | 'remove';
  }) => void;
  'message:read': (payload: { conversationId: string; userId: string; messageId: string; readAt: string }) => void;
  'message:delivered': (payload: { messageId: string; conversationId: string }) => void;
  'typing:start': (payload: { conversationId: string; userId: string; user: Pick<PublicUser, '_id' | 'displayName'> }) => void;
  'typing:stop': (payload: { conversationId: string; userId: string }) => void;
  'presence:online': (payload: { userId: string }) => void;
  'presence:offline': (payload: { userId: string; lastSeen: string }) => void;
  'conversation:created': (conversation: Conversation) => void;
  'conversation:updated': (conversation: Partial<Conversation> & { _id: string }) => void;
  'notification:new': (notification: { title: string; body: string; data?: Record<string, unknown> }) => void;
  error: (payload: { message: string; code?: string }) => void;
}

// === CLIENT → SERVER EVENTS ===
export interface ClientToServerEvents {
  'message:send': (payload: SendMessagePayload, callback: (response: { success: boolean; messageId?: string; error?: string }) => void) => void;
  'message:edit': (payload: EditMessagePayload, callback: (response: { success: boolean; error?: string }) => void) => void;
  'message:delete': (payload: { messageId: string; conversationId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'message:react': (payload: { messageId: string; conversationId: string; emoji: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'message:read': (payload: { conversationId: string; messageId: string }) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
  'presence:update': (payload: { status: 'online' | 'away' }) => void;
}
