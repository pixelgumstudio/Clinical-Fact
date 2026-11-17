import React, { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, theme } from '@clinicalfact/design-system';
import { AppLanguage, searchLanguages } from '../../i18n/languages';
import { LanguageOptionRow } from './LanguageOptionRow';
import { styles } from './LanguageList.styles';

/** Code of the optional leading row, "Default (same as app)". */
export const DEFAULT_LANGUAGE_CODE = '';

interface LanguageListProps {
  /** Selected language code, or null for the default row. */
  selected: string | null;
  /** Called with a language code, or null when the default row is picked. */
  onSelect: (code: string | null) => void;
  /** Adds a leading "Default (same as app)" row (the study-language picker uses it). */
  showDefaultOption?: boolean;
}

const DEFAULT_ROW: AppLanguage = { code: DEFAULT_LANGUAGE_CODE, name: '', nativeName: '', country: '' };

/**
 * The one language picker: a search box over the list of every language the app supports. Every
 * place that asks for a language (first-launch screen, profile, per-content pickers) uses this,
 * so they look the same, list the same languages in the same order, and behave the same.
 *
 * The language names are fixed strings, not translation keys, so the list does not change under
 * the user's finger as the interface re-translates.
 */
export const LanguageList: React.FC<LanguageListProps> = ({ selected, onSelect, showDefaultOption = false }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const languages = useMemo(() => searchLanguages(query), [query]);
  const showDefault = showDefaultOption && query.trim() === '';

  const defaultRow: AppLanguage = { ...DEFAULT_ROW, name: t('languageList.defaultSameAsApp') };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Icon name="search" size={24} />
        <TextInput
          testID="language-search"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('languageList.searchPlaceholder')}
          placeholderTextColor={theme.colors.grey[300]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel={t('languageList.searchPlaceholder')}
        />
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        accessibilityRole="radiogroup"
        data={languages}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          showDefault ? (
            <View style={styles.defaultRow}>
              <LanguageOptionRow language={defaultRow} flag="🌐" selected={selected === null} onPress={() => onSelect(null)} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <LanguageOptionRow language={item} selected={item.code === selected} onPress={onSelect} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('languageList.noResults')}</Text>}
      />
    </View>
  );
};
