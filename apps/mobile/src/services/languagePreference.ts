// apps/mobile/src/services/languagePreference.ts
//
// Remembers, on the device, the language a visitor picked on the first-launch language
// screen — before they have an account to store it on.
//
//  - "chosen" says the screen has been dealt with, so it is never shown again.
//  - "pending" holds the picked code until it has been saved to the new account. The account's
//    own language is what the app reads once signed in (see App.tsx), and a new account starts
//    on the server default (English), so without this hand-off the pick would be undone the
//    moment the person signs up.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupportedLanguage } from '../i18n/languages';

const CHOSEN_KEY = '@clinicalfact:language_chosen';
const PENDING_KEY = '@clinicalfact:language_pending_sync';

/** True once the language screen has been completed (or isn't needed). Fails closed to "chosen"
 * if storage can't be read, so a storage error never traps someone on the screen. */
export async function hasChosenLanguage(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CHOSEN_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markLanguageChosen(): Promise<void> {
  try {
    await AsyncStorage.setItem(CHOSEN_KEY, '1');
  } catch {
    /* non-fatal: the screen may show once more */
  }
}

/** Saves the pick for the account that will be created next, and marks the screen done. */
export async function rememberOnboardingLanguage(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, code);
  } catch {
    /* non-fatal */
  }
  await markLanguageChosen();
}

/** The pick waiting to be saved to an account, or null. Does not clear it. */
export async function getPendingOnboardingLanguage(): Promise<string | null> {
  try {
    const code = await AsyncStorage.getItem(PENDING_KEY);
    return isSupportedLanguage(code) ? code : null;
  } catch {
    return null;
  }
}

export async function clearPendingOnboardingLanguage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    /* non-fatal */
  }
}
