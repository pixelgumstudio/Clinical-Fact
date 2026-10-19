import { resolveLanguageAfterAuth } from '../languageSync';
import { getAuthStartRoute } from '../../navigation/authStartRoute';

describe('resolveLanguageAfterAuth', () => {
  test('with nothing picked, the account language is used as before', () => {
    expect(resolveLanguageAfterAuth({ pending: null, isFirstTimeUser: true, accountLanguage: 'fr' })).toEqual({
      language: 'fr',
      syncToAccount: false,
      clearPending: false,
    });
  });

  test('a new account takes the language picked before signing up, and saves it', () => {
    // The server gives every new account English; without the sync this pick would be undone.
    expect(resolveLanguageAfterAuth({ pending: 'de', isFirstTimeUser: true, accountLanguage: 'en' })).toEqual({
      language: 'de',
      syncToAccount: true,
      clearPending: false, // cleared only after the save succeeds
    });
  });

  test('nothing to save when the account already has the picked language', () => {
    expect(resolveLanguageAfterAuth({ pending: 'en', isFirstTimeUser: true, accountLanguage: 'en' })).toEqual({
      language: 'en',
      syncToAccount: false,
      clearPending: true,
    });
  });

  test('an existing account keeps its own language, and the stale pick is dropped', () => {
    expect(resolveLanguageAfterAuth({ pending: 'ja', isFirstTimeUser: false, accountLanguage: 'es' })).toEqual({
      language: 'es',
      syncToAccount: false,
      clearPending: true,
    });
  });

  test('a new account with no stored language still falls back to the pick', () => {
    expect(resolveLanguageAfterAuth({ pending: 'it', isFirstTimeUser: true, accountLanguage: undefined })).toMatchObject({
      language: 'it',
      syncToAccount: true,
    });
  });
});

describe('getAuthStartRoute', () => {
  test('first launch starts on the language screen', () => {
    expect(getAuthStartRoute({ languageChosen: false })).toBe('Language');
  });

  test('afterwards it starts on Intro', () => {
    expect(getAuthStartRoute({ languageChosen: true })).toBe('Intro');
  });
});
