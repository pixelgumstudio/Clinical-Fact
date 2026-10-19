import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckIcon, theme } from '@clinicalfact/design-system';
import { AppLanguage, flagEmoji } from '../i18n/languages';

interface LanguageOptionRowProps {
  language: AppLanguage;
  selected: boolean;
  onPress: (code: string) => void;
}

/** One selectable row in the language list: flag, English name, native name, and a check
 *  when selected. */
export const LanguageOptionRow: React.FC<LanguageOptionRowProps> = ({ language, selected, onPress }) => {
  // "English" under "English (US)" adds nothing; show the native name only when it says something new.
  const showNative =
    language.nativeName.toLowerCase() !== language.name.toLowerCase() && !language.name.startsWith(language.nativeName);

  return (
    <TouchableOpacity
      testID={`language-${language.code}`}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={() => onPress(language.code)}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={language.name}
    >
      <Text style={styles.flag}>{flagEmoji(language.country)}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {language.name}
      </Text>
      {showNative ? (
        <Text style={styles.native} numberOfLines={1}>
          {language.nativeName}
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}
      {selected ? (
        <View style={styles.checkCircle}>
          <CheckIcon size={14} color={theme.colors.white} />
        </View>
      ) : (
        <View style={styles.checkPlaceholder} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
  },
  rowSelected: {
    backgroundColor: theme.colors.grey[10],
  },
  flag: {
    width: 24,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
  },
  name: {
    ...theme.typography.textStyles.p1,
    flexShrink: 1,
    color: theme.colors.grey[900],
  },
  native: {
    ...theme.typography.textStyles.p2,
    flex: 1,
    color: theme.colors.grey[300],
  },
  spacer: {
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPlaceholder: {
    width: 24,
    height: 24,
  },
});
