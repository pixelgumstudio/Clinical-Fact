export const FREE_TIER_LIMITS = {
  notes: 1,
  quizzes: 1,
  flashcards: 1,
  chats: 1,
} as const;

export type QuotaFeature = 'notes' | 'quizzes' | 'flashcards' | 'chats';
