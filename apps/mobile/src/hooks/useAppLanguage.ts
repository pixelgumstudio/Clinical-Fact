import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n, { loadUserLanguage } from '../i18n';
import { restartIfDirectionChanged } from '../i18n/rtl';
import { isSupportedLanguage } from '../i18n/languages';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

/**
 * The only place the app language is read or changed after sign-in.
 *
 *  - `appLanguage`: the interface language (what the account has saved, else what is showing).
 *  - `studyLanguage`: the language AI content is written in; null = same as the app.
 *  - `setAppLanguage(code)`: switches the interface first so the change feels instant, then
 *    saves it to the account. If saving fails the interface goes back to the previous language,
 *    so what the person sees and what is saved never disagree.
 *  - `setStudyLanguage(code | null)`: saves the AI content language (nothing on screen changes).
 *
 * Both return true when the account was updated, and show a translated alert either way.
 */
export function useAppLanguage() {
  useTranslation(); // re-render when the interface language changes
  const user = useAuthStore((s) => s.user);

  const saved = user?.preferredLanguage;
  const appLanguage = isSupportedLanguage(saved) ? saved : isSupportedLanguage(i18n.language) ? i18n.language : 'en';
  const studyLanguage = isSupportedLanguage(user?.studyLanguage) ? user!.studyLanguage! : null;

  const setAppLanguage = useCallback(async (code: string): Promise<boolean> => {
    const previous = i18n.language;
    // The layout direction is recorded now but the restart waits until the save has succeeded.
    await loadUserLanguage(code, { restart: false });

    let response;
    try {
      response = await api.updateUserLanguage(code);
    } catch {
      response = undefined;
    }

    if (!response?.success) {
      await loadUserLanguage(previous, { restart: false });
      Alert.alert(i18n.t('common.error'), i18n.t('profile.languageUpdateFailed'));
      return false;
    }

    useAuthStore.getState().updateUser({ preferredLanguage: response.data?.user?.preferredLanguage || code });
    // A restart (right-to-left languages) makes an alert pointless; it would vanish with the screen.
    if (!(await restartIfDirectionChanged(code))) {
      Alert.alert(i18n.t('common.success'), i18n.t('profile.languageUpdated'));
    }
    return true;
  }, []);

  const setStudyLanguage = useCallback(async (code: string | null): Promise<boolean> => {
    let response;
    try {
      response = await api.updateUserStudyLanguage(code);
    } catch {
      response = undefined;
    }

    if (!response?.success) {
      Alert.alert(i18n.t('common.error'), i18n.t('profile.studyLanguageUpdateFailed'));
      return false;
    }

    const confirmed = response.data?.user?.studyLanguage;
    useAuthStore.getState().updateUser({ studyLanguage: confirmed === undefined ? code : confirmed });
    Alert.alert(i18n.t('common.success'), i18n.t('profile.studyLanguageUpdated'));
    return true;
  }, []);

  return { appLanguage, studyLanguage, setAppLanguage, setStudyLanguage };
}
