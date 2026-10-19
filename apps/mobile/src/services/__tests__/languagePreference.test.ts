import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasChosenLanguage,
  markLanguageChosen,
  rememberOnboardingLanguage,
  getPendingOnboardingLanguage,
  clearPendingOnboardingLanguage,
} from '../languagePreference';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
      setItem: jest.fn(async (k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: jest.fn(async (k: string) => {
        delete store[k];
      }),
      __reset: () => {
        store = {};
      },
    },
  };
});

const storage = AsyncStorage as any;

describe('languagePreference', () => {
  beforeEach(() => {
    storage.__reset();
    jest.clearAllMocks();
  });

  test('a fresh install has not chosen a language', async () => {
    expect(await hasChosenLanguage()).toBe(false);
  });

  test('once marked, it stays chosen', async () => {
    await markLanguageChosen();
    expect(await hasChosenLanguage()).toBe(true);
  });

  test('remembering a pick marks the screen done and keeps the pick for the next account', async () => {
    await rememberOnboardingLanguage('de');

    expect(await hasChosenLanguage()).toBe(true);
    expect(await getPendingOnboardingLanguage()).toBe('de');
  });

  test('reading the pending pick does not consume it', async () => {
    await rememberOnboardingLanguage('fr');
    await getPendingOnboardingLanguage();
    expect(await getPendingOnboardingLanguage()).toBe('fr');
  });

  test('clearing removes the pending pick but the screen stays done', async () => {
    await rememberOnboardingLanguage('es');

    await clearPendingOnboardingLanguage();

    expect(await getPendingOnboardingLanguage()).toBeNull();
    expect(await hasChosenLanguage()).toBe(true);
  });

  test('a stored value that is not a supported language is ignored', async () => {
    await storage.setItem('@clinicalfact:language_pending_sync', 'klingon');
    expect(await getPendingOnboardingLanguage()).toBeNull();
  });

  describe('when storage fails, the app is never trapped or broken', () => {
    test('an unreadable flag counts as chosen, so the screen is not shown in a loop', async () => {
      storage.getItem.mockRejectedValueOnce(new Error('disk'));
      expect(await hasChosenLanguage()).toBe(true);
    });

    test('writes that fail do not throw', async () => {
      storage.setItem.mockRejectedValue(new Error('disk'));
      await expect(markLanguageChosen()).resolves.toBeUndefined();
      await expect(rememberOnboardingLanguage('de')).resolves.toBeUndefined();
    });

    test('an unreadable pending pick is treated as none', async () => {
      storage.getItem.mockRejectedValueOnce(new Error('disk'));
      expect(await getPendingOnboardingLanguage()).toBeNull();
    });
  });
});
