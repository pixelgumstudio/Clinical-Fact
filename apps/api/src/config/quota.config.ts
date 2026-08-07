// ⚠️ DEV MODE: limits raised to effectively-unlimited for testing during development.
// Revert to the real launch limits (commented below) before going live.
// Real limits: notes: 1, quizzes: 1, flashcards: 1, chats: 1, medicalChats: 2
export const FREE_TIER_LIMITS = {
  notes: 999,
  quizzes: 999,
  flashcards: 999,
  chats: 999,
  medicalChats: 999,
} as const;

export type QuotaFeature = 'notes' | 'quizzes' | 'flashcards' | 'chats' | 'medicalChats';
