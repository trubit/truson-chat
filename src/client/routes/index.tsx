export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  VERIFY_EMAIL: '/verify-email/:token',
  VERIFY_PHONE: '/verify-phone',
  // Chat
  CHAT: '/chat',
  CHAT_CONVERSATION: '/chat/:id',
  CHAT_GROUP: '/chat/g/:groupId',
  // Social — Phase 4
  CONTACTS: '/contacts',
  FRIENDS: '/friends',
  DISCOVERY: '/discovery',
  BLOCKING: '/blocking',
  PRIVACY_SETTINGS: '/privacy',
  // Profile & settings
  PROFILE: '/profile',
  PROFILE_USER: '/profile/:username',
  SETTINGS: '/settings',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_PRIVACY: '/settings/privacy',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_SECURITY: '/settings/security',
  PROFILE_EDIT: '/settings/profile',
  // Phase 7 — Groups, Communities, Channels
  GROUPS: '/groups',
  GROUP: '/groups/:groupId',
  COMMUNITIES: '/communities',
  COMMUNITY: '/communities/:communityId',
  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SYSTEM: '/admin/system',
  NOT_FOUND: '*',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
