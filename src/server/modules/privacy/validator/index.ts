import { z } from 'zod';
import mongoose from 'mongoose';

const isObjectId = (v: string) => mongoose.isValidObjectId(v);

export const updatePrivacySchema = z.object({
  profileVisibility: z.enum(['everyone', 'contacts', 'friends', 'nobody']).optional(),
  phoneVisibility: z.enum(['nobody', 'contacts', 'friends']).optional(),
  emailVisibility: z.enum(['nobody', 'contacts', 'friends']).optional(),
  lastSeenVisibility: z.enum(['everyone', 'contacts', 'friends', 'nobody']).optional(),
  onlineStatusVisibility: z.enum(['everyone', 'contacts', 'friends', 'nobody']).optional(),
  friendRequestsFrom: z.enum(['everyone', 'contacts', 'friends']).optional(),
  searchVisibility: z.enum(['everyone', 'contacts', 'friends']).optional(),
  discoverable: z.boolean().optional(),
  allowContactFromEveryone: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().refine(isObjectId, 'Invalid user ID'),
});
