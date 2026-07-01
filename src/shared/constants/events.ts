export const SOCKET_EVENTS = {
  // Messages
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_REACTION: 'message:reaction',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_SEND: 'message:send',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_REACT: 'message:react',
  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  // Presence
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  PRESENCE_UPDATE: 'presence:update',
  // Conversations
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  // Notifications
  NOTIFICATION_NEW: 'notification:new',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
