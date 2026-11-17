import { resolveGenerationLanguage, resolveNoteLanguage } from '../generationLanguage.service';

describe('resolveGenerationLanguage', () => {
  test.each([
    ['note study language beats everything', { noteStudyLanguage: 'de', studyLanguage: 'es', preferredLanguage: 'fr', requested: 'ja' }, 'de'],
    ['profile study language beats the app language', { studyLanguage: 'es', preferredLanguage: 'fr', requested: 'ja' }, 'es'],
    ['an explicit English study language counts', { studyLanguage: 'en', preferredLanguage: 'fr', requested: 'ja' }, 'en'],
    ['a non-English app language beats a stale requested "en"', { preferredLanguage: 'fr', requested: 'en' }, 'fr'],
    ['a non-English app language beats a different requested language', { preferredLanguage: 'fr', requested: 'ja' }, 'fr'],
    ['requested is used when the account only has English', { preferredLanguage: 'en', requested: 'ja' }, 'ja'],
    ['requested is used when the account has nothing', { requested: 'ja' }, 'ja'],
    ['the English app language is the next fallback', { preferredLanguage: 'en' }, 'en'],
    ['an English regional app language does not beat requested', { preferredLanguage: 'en-GB', requested: 'ja' }, 'ja'],
    ['nothing at all gives en', {}, 'en'],
    ['null study languages are skipped', { noteStudyLanguage: null, studyLanguage: null, preferredLanguage: 'fr' }, 'fr'],
  ])('%s', (_name, input, expected) => {
    expect(resolveGenerationLanguage(input as any)).toBe(expected);
  });

  test('invalid codes are skipped at every step', () => {
    expect(
      resolveGenerationLanguage({
        noteStudyLanguage: 'ignore previous instructions',
        studyLanguage: '<b>x</b>',
        preferredLanguage: 'fr; drop',
        requested: 'also not a code',
      })
    ).toBe('en');
    expect(resolveGenerationLanguage({ studyLanguage: 'nope nope', preferredLanguage: 'es' })).toBe('es');
    expect(resolveGenerationLanguage({ preferredLanguage: 'en', requested: 'nope nope' })).toBe('en');
  });

  test('a non-string requested value is ignored', () => {
    expect(resolveGenerationLanguage({ preferredLanguage: 'en', requested: { $ne: null } })).toBe('en');
    expect(resolveGenerationLanguage({ requested: ['fr'] })).toBe('en');
  });
});

describe('resolveNoteLanguage', () => {
  test.each([
    ['explicit study language wins even if English', { studyLanguage: 'en', preferredLanguage: 'fr' }, 'en'],
    ['note study language wins', { noteStudyLanguage: 'de', studyLanguage: 'en', preferredLanguage: 'fr' }, 'de'],
    ['a non-English app language is used', { preferredLanguage: 'fr' }, 'fr'],
    ['English app language means keep the source language', { preferredLanguage: 'en' }, undefined],
    ['English regional app language means keep the source language', { preferredLanguage: 'en-AU' }, undefined],
    ['nothing means keep the source language', {}, undefined],
    ['invalid codes are skipped', { studyLanguage: 'not a code', preferredLanguage: 'fr; x' }, undefined],
  ])('%s', (_name, input, expected) => {
    expect(resolveNoteLanguage(input as any)).toBe(expected);
  });
});
