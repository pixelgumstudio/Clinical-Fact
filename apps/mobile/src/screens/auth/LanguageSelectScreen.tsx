import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '@clinicalfact/design-system';
import i18n, { loadUserLanguage } from '../../i18n';
import { restartIfDirectionChanged } from '../../i18n/rtl';
import { isSupportedLanguage } from '../../i18n/languages';
import { rememberOnboardingLanguage } from '../../services/languagePreference';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { LanguageList } from '../../components/language/LanguageList';
import { styles } from './LanguageSelectScreen.styles';

type LanguageSelectNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Language'>;

/**
 * First screen after the splash for someone who is not signed in and has never opened the app
 * before. Picking a language switches the interface immediately, so the screen itself
 * re-translates as they choose. See services/languageSync.ts for how the pick reaches the
 * account they create next.
 */
export const LanguageSelectScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<LanguageSelectNavigationProp>();

  const [selected, setSelected] = useState<string>(() => (isSupportedLanguage(i18n.language) ? i18n.language : 'en'));
  const [isSaving, setSaving] = useState(false);
  // A ref, not the state above: two quick taps both run before React re-renders, so only a
  // synchronous guard stops the second one.
  const savingRef = useRef(false);

  const handleSelect = (code: string | null) => {
    if (!code) return;
    setSelected(code);
    // Apply right away; this also keeps the choice for the next launch.
    // Preview only: the layout direction (and its one restart) waits for Continue.
    loadUserLanguage(code, { restart: false });
  };

  const handleContinue = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    await rememberOnboardingLanguage(selected);
    if (await restartIfDirectionChanged(selected)) return; // restarting into the new direction
    navigation.replace('Intro');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.backSpacer} />

        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {t('auth.languageSelect.title')}
          </Text>
          <Text style={styles.subtitle}>{t('auth.languageSelect.subtitle')}</Text>
        </View>

        <LanguageList selected={selected} onSelect={handleSelect} />

        <View style={styles.footer}>
          <Button variant="primary" fullWidth onPress={handleContinue} disabled={isSaving}>
            {t('auth.buttons.continue')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LanguageSelectScreen;
