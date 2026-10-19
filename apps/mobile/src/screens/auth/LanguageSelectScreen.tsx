import React, { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, Icon, theme } from '@clinicalfact/design-system';
import i18n, { loadUserLanguage } from '../../i18n';
import { syncLayoutDirection } from '../../i18n/rtl';
import { AppLanguage, isSupportedLanguage, searchLanguages } from '../../i18n/languages';
import { rememberOnboardingLanguage } from '../../services/languagePreference';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { LanguageOptionRow } from '../../components/LanguageOptionRow';

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

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>(() => (isSupportedLanguage(i18n.language) ? i18n.language : 'en'));
  const [isSaving, setSaving] = useState(false);
  // A ref, not the state above: two quick taps both run before React re-renders, so only a
  // synchronous guard stops the second one.
  const savingRef = useRef(false);

  const languages = useMemo(() => searchLanguages(query), [query]);

  const handleSelect = (code: string) => {
    setSelected(code);
    // Apply right away; this also keeps the choice for the next launch.
    // Preview only: the layout direction (and its one restart) waits for Continue.
    loadUserLanguage(code, { applyDirection: false });
  };

  const handleContinue = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    await rememberOnboardingLanguage(selected);
    if (await syncLayoutDirection(selected)) return; // restarting into the new direction
    navigation.replace('Intro');
  };

  const renderItem = ({ item }: { item: AppLanguage }) => (
    <LanguageOptionRow language={item} selected={item.code === selected} onPress={handleSelect} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {t('auth.languageSelect.title')}
          </Text>
          <Text style={styles.subtitle}>{t('auth.languageSelect.subtitle')}</Text>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={24} />
          <TextInput
            testID="language-search"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('auth.languageSelect.searchPlaceholder')}
            placeholderTextColor={theme.colors.grey[300]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={languages}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>{t('auth.languageSelect.noResults')}</Text>}
        />

        <View style={styles.footer}>
          <Button variant="primary" fullWidth onPress={handleContinue} disabled={isSaving}>
            {t('auth.buttons.continue')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  keyboardView: {
    flex: 1,
  },
  titleBlock: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[2],
    gap: theme.spacing[4],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
  },
  searchBox: {
    height: 48,
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.input,
  },
  searchInput: {
    ...theme.typography.textStyles.p1,
    flex: 1,
    color: theme.colors.grey[900],
    paddingVertical: 0,
  },
  list: {
    flex: 1,
    marginTop: theme.spacing[4],
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    gap: theme.spacing[2],
  },
  empty: {
    ...theme.typography.textStyles.p1,
    paddingVertical: theme.spacing[8],
    textAlign: 'center',
    color: theme.colors.grey[300],
  },
  footer: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[6],
  },
});

export default LanguageSelectScreen;
