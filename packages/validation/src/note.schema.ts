import { z } from 'zod';

export const createNoteSchema = z.object({
  name: z.string().min(1, 'Note name is required'),
  type: z.enum(['AUDIO', 'VIDEO', 'PDF', 'IMAGE', 'TEXT', 'YOUTUBE']),
  content: z.string().optional(),
  folderId: z.string().optional(),
});

export const updateNoteSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  formattedContent: z.string().optional(),
  folderId: z.string().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
