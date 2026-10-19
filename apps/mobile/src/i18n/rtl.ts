import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Languages written right to left. Matched on the base code, so "ar-AE" and "ar-EG" count as Arabic.
const RTL_LANGUAGES = ['ar', 'he', 'ur'];

const RELOAD_GUARD_KEY = '@clinicalfact:rtl_reload_for';

export const isRtlLanguage = (code: string | null | undefined): boolean =>
  !!code && RTL_LANGUAGES.includes(code.split('-')[0].toLowerCase());

/**
 * Makes the app's layout direction match the language. React Native only reads the direction at
 * startup, so a change needs one restart of the JS bundle (not a reinstall; OTA builds support it).
 * Returns true when a restart was started — callers should stop doing work then.
 *
 * The AsyncStorage guard stops a restart loop on runtimes that ignore forceRTL (e.g. Expo Go):
 * the restart is attempted once per direction, never repeatedly.
 */
export async function syncLayoutDirection(languageCode: string): Promise<boolean> {
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

  I18nManager.allowRTL(true);
  I18nManager.forceRTL(wantRtl);
  try {
    await Updates.reloadAsync();
    return true;
  } catch {
    return false; // dev client / unsupported runtime — takes effect on the next manual restart
  }
}
