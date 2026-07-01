export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  BUSINESS: 'business',
} as const;

export const MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

export const ROLE_WEIGHTS: Record<string, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

export function hasHigherOrEqualRole(a: string, b: string): boolean {
  return (ROLE_WEIGHTS[a] ?? 0) >= (ROLE_WEIGHTS[b] ?? 0);
}
