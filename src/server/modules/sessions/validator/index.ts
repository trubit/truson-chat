import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const sessionIdParamSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid ID'),
});
