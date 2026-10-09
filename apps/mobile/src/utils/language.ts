export interface LanguageInfo {
  flag: string;
  code: string;
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  en: { flag: '🇺🇸', code: 'En' },
  es: { flag: '🇪🇸', code: 'Es' },
  fr: { flag: '🇫🇷', code: 'Fr' },
  de: { flag: '🇩🇪', code: 'De' },
  pt: { flag: '🇵🇹', code: 'Pt' },
};

export const getLanguageInfo = (code: string): LanguageInfo => LANGUAGE_MAP[code] || LANGUAGE_MAP.en;
