/**
 * The languages the app can be used in — the same set as the translation files in ./locales
 * and the API's `preferredLanguage` list (User.ts). Adding a language here without both of
 * those would let someone pick one the app can't actually show or save.
 *
 * Names are fixed strings rather than translation keys on purpose: in a language picker the
 * list must not change as the interface re-translates under the user's finger.
 */

export interface AppLanguage {
  /** App locale code, e.g. `fr` or `pt-PT` — also the key of the file in ./locales. */
  code: string;
  /** English name. */
  name: string;
  /** The language's own name, so a speaker can recognise it without reading English. */
  nativeName: string;
  /** ISO 3166-1 alpha-2 country whose flag represents it. */
  country: string;
}

export const APP_LANGUAGES: readonly AppLanguage[] = [
  { code: 'en', name: 'English (US)', nativeName: 'English', country: 'us' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English', country: 'gb' },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English', country: 'au' },
  { code: 'en-CA', name: 'English (Canada)', nativeName: 'English', country: 'ca' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', country: 'es' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', country: 'mx' },
  { code: 'fr', name: 'French', nativeName: 'Français', country: 'fr' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Français (Canada)', country: 'ca' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', country: 'de' },
  { code: 'pt', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', country: 'br' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Português (Portugal)', country: 'pt' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', country: 'it' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', country: 'nl' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', country: 'pl' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', country: 'se' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', country: 'no' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', country: 'dk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', country: 'fi' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', country: 'cz' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', country: 'sk' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', country: 'si' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', country: 'hr' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', country: 'hu' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', country: 'ro' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', country: 'gr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', country: 'tr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', country: 'ru' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', country: 'ua' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', country: 'sa' },
  { code: 'ar-AE', name: 'Arabic (UAE)', nativeName: 'العربية (الإمارات)', country: 'ae' },
  { code: 'ar-EG', name: 'Arabic (Egypt)', nativeName: 'العربية (مصر)', country: 'eg' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', country: 'il' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', country: 'in' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', country: 'bd' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', country: 'in' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', country: 'in' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', country: 'in' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', country: 'in' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', country: 'in' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', country: 'in' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', country: 'in' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', country: 'pk' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', country: 'cn' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', country: 'tw' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', country: 'jp' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', country: 'kr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', country: 'vn' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', country: 'th' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', country: 'my' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', country: 'id' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', country: 'es' },
];

export const isSupportedLanguage = (code: string | null | undefined): code is string =>
  !!code && APP_LANGUAGES.some((l) => l.code === code);

/** Flag emoji for a two-letter country code (`'de'` → 🇩🇪), built from regional-indicator
 * symbols, so no per-country table is needed. Anything that isn't two letters gets a plain flag. */
export function flagEmoji(country: string): string {
  if (!/^[a-z]{2}$/i.test(country)) return '🏳️';
  return String.fromCodePoint(
    ...country
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/** Lower-cases and strips accents so "espanol" finds "Español" and "cesky" finds "Čeština". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Languages matching `query` in either their English or their own name; all of them when
 * the query is empty. */
export function searchLanguages(query: string, languages: readonly AppLanguage[] = APP_LANGUAGES): AppLanguage[] {
  const q = fold(query);
  if (!q) return [...languages];
  return languages.filter((l) => fold(l.name).includes(q) || fold(l.nativeName).includes(q) || l.code.toLowerCase() === q);
}
