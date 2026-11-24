import fs from 'fs';
import path from 'path';
import { APP_LANGUAGES, flagEmoji, isSupportedLanguage, searchLanguages } from '../languages';

describe('APP_LANGUAGES', () => {
  test('has no duplicate codes', () => {
    const codes = APP_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('every language has a translation file the app can load', () => {
    const files = new Set(fs.readdirSync(path.join(__dirname, '../locales')).map((f) => f.replace('.json', '')));
    const missing = APP_LANGUAGES.filter((l) => !files.has(l.code)).map((l) => l.code);
    expect(missing).toEqual([]);
  });

  test('every translation file is offered (no language is shipped but unreachable)', () => {
    const files = fs.readdirSync(path.join(__dirname, '../locales')).map((f) => f.replace('.json', ''));
    const offered = new Set(APP_LANGUAGES.map((l) => l.code));
    expect(files.filter((f) => !offered.has(f))).toEqual([]);
  });

  // The picked language is saved to the account; the API rejects any code outside its list.
  test('every language is accepted by the API (SUPPORTED_LANGUAGE_CODES, used by the User and Note enums)', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../../api/src/utils/language.ts'), 'utf8');
    const block = source.slice(source.indexOf('SUPPORTED_LANGUAGE_CODES = ['));
    const list = block.slice(0, block.indexOf('] as const'));
    const accepted = new Set([...list.matchAll(/'([^']+)'/g)].map((m) => m[1]));

    expect(APP_LANGUAGES.filter((l) => !accepted.has(l.code)).map((l) => l.code)).toEqual([]);
    // and the other way round: the API must not accept a language the app cannot show
    const offered = new Set(APP_LANGUAGES.map((l) => l.code));
    expect([...accepted].filter((c) => !offered.has(c))).toEqual([]);
  });

  test('the API models take their language enum from that one list', () => {
    for (const file of ['User.ts', 'Note.ts']) {
      const source = fs.readFileSync(path.join(__dirname, '../../../../api/src/models', file), 'utf8');
      expect(source).toContain('...SUPPORTED_LANGUAGE_CODES');
    }
  });

  test('every language has an English name, a native name and a two-letter flag country', () => {
    for (const l of APP_LANGUAGES) {
      expect(l.name.trim()).not.toBe('');
      expect(l.nativeName.trim()).not.toBe('');
      expect(l.country).toMatch(/^[a-z]{2}$/);
    }
  });

  test('English (US) comes first and the list matches the design wording', () => {
    expect(APP_LANGUAGES[0]).toMatchObject({ code: 'en', name: 'English (US)', country: 'us' });
    expect(APP_LANGUAGES.find((l) => l.code === 'pt')!.name).toBe('Portuguese (Brazil)');
  });
});

describe('isSupportedLanguage', () => {
  test.each([['en'], ['pt-PT'], ['zh-TW']])('%s is supported', (code) => expect(isSupportedLanguage(code)).toBe(true));
  test.each([['xx'], [''], [null], [undefined], ['EN']])('%p is not', (code) => expect(isSupportedLanguage(code as any)).toBe(false));
});

describe('flagEmoji', () => {
  test('builds the flag from the country code', () => {
    expect(flagEmoji('de')).toBe('🇩🇪');
    expect(flagEmoji('US')).toBe('🇺🇸');
    expect(flagEmoji('br')).toBe('🇧🇷');
    expect(flagEmoji('cz')).toBe('🇨🇿');
  });

  test('a flag exists for every language (none fall back to the plain flag)', () => {
    for (const l of APP_LANGUAGES) expect(flagEmoji(l.country)).not.toBe('🏳️');
  });

  test('anything that is not two letters gets the plain flag', () => {
    expect(flagEmoji('')).toBe('🏳️');
    expect(flagEmoji('usa')).toBe('🏳️');
    expect(flagEmoji('1x')).toBe('🏳️');
  });

  // Mockup mistakes this guards against: Polish shown with the Czech flag, English (US) with the UK flag.
  test('flags match their languages', () => {
    const flag = (code: string) => flagEmoji(APP_LANGUAGES.find((l) => l.code === code)!.country);
    expect(flag('pl')).toBe('🇵🇱');
    expect(flag('en')).toBe('🇺🇸');
    expect(flag('en-GB')).toBe('🇬🇧');
  });
});

describe('searchLanguages', () => {
  const codes = (q: string) => searchLanguages(q).map((l) => l.code);

  test('an empty search returns everything', () => {
    expect(searchLanguages('')).toHaveLength(APP_LANGUAGES.length);
    expect(searchLanguages('   ')).toHaveLength(APP_LANGUAGES.length);
  });

  test('matches English names, ignoring case', () => {
    expect(codes('GERMAN')).toEqual(['de']);
    expect(codes('span')).toEqual(['es', 'es-MX']);
  });

  test('matches a language by its own name', () => {
    expect(codes('deutsch')).toEqual(['de']);
    expect(codes('日本')).toEqual(['ja']);
    expect(codes('العربية')).toEqual(['ar', 'ar-AE', 'ar-EG']);
  });

  test('ignores accents both ways', () => {
    expect(codes('espanol')).toEqual(['es', 'es-MX']);
    expect(codes('cestina')).toEqual(['cs']);
    expect(codes('Português')).toEqual(codes('portugues'));
  });

  test('finds regional variants', () => {
    expect(codes('mexico')).toEqual(['es-MX']);
    expect(codes('uk')).toContain('en-GB');
  });

  test('an exact language code finds it', () => {
    expect(codes('pt-pt')).toEqual(['pt-PT']);
  });

  test('no match is an empty list', () => {
    expect(codes('klingon')).toEqual([]);
  });
});
