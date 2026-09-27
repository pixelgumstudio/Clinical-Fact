// Real launch limits — FREE users get this many lifetime sessions per feature (see
// quota.service.ts: checked once at session creation, not per-message, so a free medical Q&A
// session itself allows unlimited back-and-forth messages once started; the limit is on how
// many separate sessions a FREE user can start). PRO users bypass this check entirely
// (checkQuota returns immediately for any non-FREE subscription) and can chat/generate without
// limit regardless of these numbers.
export const FREE_TIER_LIMITS = {
  notes: 1,
  quizzes: 1,
  flashcards: 1,
  chats: 1,
  medicalChats: 2,
} as const;

export type QuotaFeature = 'notes' | 'quizzes' | 'flashcards' | 'chats' | 'medicalChats';
