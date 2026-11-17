import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CheckIcon, theme } from '@clinicalfact/design-system';
import { AppLanguage, flagEmoji } from '../../i18n/languages';
import { styles } from './LanguageOptionRow.styles';

interface LanguageOptionRowProps {
  language: AppLanguage;
  selected: boolean;
  onPress: (code: string) => void;
  /** Replaces the country flag (the "Default (same as app)" row shows a globe). */
  flag?: string;
}

/** One selectable row in the language list: flag, English name, native name, and a check
 *  when selected. */
export const LanguageOptionRow: React.FC<LanguageOptionRowProps> = ({ language, selected, onPress, flag }) => {
  // "English" under "English (US)" adds nothing; show the native name only when it says something new.
  const showNative =
    !!language.nativeName &&
    language.nativeName.toLowerCase() !== language.name.toLowerCase() &&
    !language.name.startsWith(language.nativeName);

  return (
    <TouchableOpacity
      testID={`language-${language.code}`}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={() => onPress(language.code)}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={showNative ? `${language.name}, ${language.nativeName}` : language.name}
    >
      <Text style={styles.flag}>{flag ?? flagEmoji(language.country)}</Text>
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
