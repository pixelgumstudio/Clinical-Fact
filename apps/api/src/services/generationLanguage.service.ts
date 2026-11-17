import { languageName } from '../utils/language';

// The language an account's AI output should be written in is decided on the server, from the
// account. The app keeps its own copy of the language and that copy can be stale (an app that
// sent "en" for an account set to French used to make every quiz come out in English), so a
// value sent with the request only counts when the account has no stronger preference.

type MaybeCode = string | null | undefined;

export interface GenerationLanguageInput {
  noteStudyLanguage?: MaybeCode;
  studyLanguage?: MaybeCode;
  preferredLanguage?: MaybeCode;
  /** What the app sent with this request. Untrusted. */
  requested?: unknown;
}

const valid = (code: unknown): code is string => typeof code === 'string' && languageName(code) !== undefined;
const isEnglish = (code: string) => code.split('-')[0].toLowerCase() === 'en';

/**
 * Language for chat, quizzes, flashcards, exports and any other generated text.
 *  1. the note's study language, then the profile's study language (explicit; applies even for English)
 *  2. the account's app language when it is not English ("en" is also what every account has
 *     until its owner opens the picker, so it cannot beat an app that says otherwise)
 *  3. what the app sent with this request
 *  4. the account's app language (English), then "en"
 * Anything that is not a valid language code is skipped.
 */
export function resolveGenerationLanguage(input: GenerationLanguageInput): string {
  const { noteStudyLanguage, studyLanguage, preferredLanguage, requested } = input;

  for (const explicit of [noteStudyLanguage, studyLanguage]) {
    if (valid(explicit)) return explicit;
  }
  if (valid(preferredLanguage) && !isEnglish(preferredLanguage)) return preferredLanguage;
  if (valid(requested)) return requested;
  if (valid(preferredLanguage)) return preferredLanguage;
  return 'en';
}

/**
 * Language for NEW notes made from a source file. An explicit study language wins even if it
 * is English; otherwise the app language when it is not English; otherwise undefined, meaning
 * "keep the language of the source" (a Spanish PDF uploaded by a default-English account must
 * not turn into an English note).
 */
export function resolveNoteLanguage(input: Omit<GenerationLanguageInput, 'requested'>): string | undefined {
  const { noteStudyLanguage, studyLanguage, preferredLanguage } = input;

  for (const explicit of [noteStudyLanguage, studyLanguage]) {
    if (valid(explicit)) return explicit;
  }
  if (valid(preferredLanguage) && !isEnglish(preferredLanguage)) return preferredLanguage;
  return undefined;
}

/**
 * Note language for a user who is not on the current request (background workers only know the
 * note's owner). Reads the account's languages fresh, so a worker never uses a stale copy.
 */
export async function resolveNoteLanguageForUser(userId: unknown, noteStudyLanguage?: MaybeCode): Promise<string | undefined> {
  const { User } = await import('../models/User');
  const user = await User.findById(userId).select('studyLanguage preferredLanguage').lean();
  return resolveNoteLanguage({
    noteStudyLanguage,
    studyLanguage: user?.studyLanguage,
    preferredLanguage: user?.preferredLanguage,
  });
}
