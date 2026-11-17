// Language codes the app and the API agree on (mobile: src/i18n/languages.ts, User.ts enum).
// One list here so the Mongoose enums, the profile endpoint and the prompts can't drift apart.
export const SUPPORTED_LANGUAGE_CODES = [
  'en', 'en-GB', 'en-AU', 'en-CA', 'es', 'es-MX', 'fr', 'fr-CA', 'de', 'pt', 'pt-PT', 'it', 'nl', 'pl', 'sv', 'no',
  'da', 'fi', 'cs', 'sk', 'sl', 'hr', 'hu', 'ro', 'el', 'tr', 'ru', 'uk', 'ar', 'ar-AE', 'ar-EG', 'he', 'hi', 'bn',
  'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'pa', 'ur', 'zh-CN', 'zh-TW', 'ja', 'ko', 'vi', 'th', 'ms', 'id', 'ca',
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const isSupportedLanguageCode = (code: unknown): code is SupportedLanguageCode =>
  typeof code === 'string' && (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code);

// A language code that arrives in a request body is untrusted text. Only this shape may ever be
// looked up or placed in a prompt (e.g. "fr", "pt-PT", "zh-CN", "es-419").
const LANGUAGE_CODE_SHAPE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$/;

// Explicit names for codes where Intl.DisplayNames is ambiguous or misleading for an LLM.
// "no" must not read as a refusal; "pt" is Brazilian in this app; Arabic means Modern Standard Arabic.
const EXPLICIT_NAMES: Record<string, string> = {
  en: 'English',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'en-CA': 'English (Canada)',
  es: 'Spanish',
  'es-MX': 'Spanish (Mexico)',
  fr: 'French',
  'fr-CA': 'French (Canada)',
  pt: 'Brazilian Portuguese',
  'pt-BR': 'Brazilian Portuguese',
  'pt-PT': 'European Portuguese',
  no: 'Norwegian (Bokmål)',
  nb: 'Norwegian (Bokmål)',
  'zh-CN': 'Simplified Chinese',
  'zh-Hans': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese (Taiwan)',
  'zh-Hant': 'Traditional Chinese',
  ar: 'Arabic (Modern Standard Arabic)',
  'ar-AE': 'Arabic (Modern Standard Arabic)',
  'ar-EG': 'Arabic (Modern Standard Arabic)',
  he: 'Hebrew',
  hi: 'Hindi',
  ur: 'Urdu',
  ms: 'Malay',
  id: 'Indonesian',
};

const normalise = (code: string): string => {
  const [base, ...rest] = code.split('-');
  return [base.toLowerCase(), ...rest.map((p) => (p.length === 2 ? p.toUpperCase() : p.length === 4 ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))].join('-');
};

/**
 * The English name of a language code, for use in a prompt ("Write in French"), or undefined
 * when the value is not a language code. Never returns the input text.
 */
export const languageName = (code: unknown): string | undefined => {
  if (typeof code !== 'string' || !LANGUAGE_CODE_SHAPE.test(code)) return undefined;
  const normalised = normalise(code);
  if (EXPLICIT_NAMES[normalised]) return EXPLICIT_NAMES[normalised];
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(normalised);
    if (!name || name.toLowerCase() === normalised.toLowerCase()) return undefined;
    return name;
  } catch {
    return undefined;
  }
};

/** True for anything `languageName` can turn into a name. */
export const isValidLanguageCode = (code: unknown): code is string => languageName(code) !== undefined;

/**
 * The instruction block added to every generation prompt. Names the language, says the source
 * may be in another language, and protects clinical values from being altered in translation.
 */
export const languageInstruction = (code: string, what: string): string => {
  const name = languageName(code);
  if (!name) return '';
  return `LANGUAGE: Write ${what} in ${name} only. The source material may be in a different language; do not copy its language and do not switch to it. Keep every number, dose, unit, route, frequency, drug name, lab value, code and abbreviation (for example mg, mcg, mmol/L, q8h, IV, BID, ICD-10, NCLEX) exactly as written, with the same decimal separator and digits (write "0.5 mg", not "0,5 mg").`;
};
