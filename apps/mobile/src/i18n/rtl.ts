import { DevSettings, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Languages written right to left. Matched on the base code, so "ar-AE" and "ar-EG" count as Arabic.
const RTL_LANGUAGES = ['ar', 'he', 'ur', 'fa'];

const RELOAD_GUARD_KEY = '@clinicalfact:rtl_reload_for';

export const isRtlLanguage = (code: string | null | undefined): boolean =>
  !!code && RTL_LANGUAGES.includes(code.split('-')[0].toLowerCase());

/**
 * Step 1 — records the direction the language wants. React Native only reads it at startup, so
 * this changes nothing on screen by itself. It is set for EVERY language, and forced off for
 * left-to-right ones, so a phone set to Arabic does not flip an English app.
 */
export function applyDirection(languageCode: string): void {
  const rtl = isRtlLanguage(languageCode);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/**
 * Step 2 — restarts the JS bundle when the running direction differs from the language's. Call
 * it AFTER anything that must still be saved (the restart cuts work short). Returns true when a
 * restart was started; callers should stop doing work then.
 *
 * The AsyncStorage marker stops a restart loop on runtimes that ignore forceRTL (e.g. Expo Go):
 * the restart is attempted once per direction, never repeatedly.
 */
export async function restartIfDirectionChanged(languageCode: string): Promise<boolean> {
  const wantRtl = isRtlLanguage(languageCode);
  if (I18nManager.isRTL === wantRtl) {
    try {
      await AsyncStorage.removeItem(RELOAD_GUARD_KEY);
    } catch {
      /* non-fatal */
    }
    return false;
  }

  try {
    if ((await AsyncStorage.getItem(RELOAD_GUARD_KEY)) === String(wantRtl)) return false;
    await AsyncStorage.setItem(RELOAD_GUARD_KEY, String(wantRtl));
  } catch {
    return false; // can't prove we won't loop, so don't restart
  }

  applyDirection(languageCode);
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    // Dev builds have no expo-updates runtime; fall back to the dev menu's reload.
    try {
      DevSettings.reload();
      return true;
    } catch {
      return false; // takes effect on the next manual restart
    }
  }
}
