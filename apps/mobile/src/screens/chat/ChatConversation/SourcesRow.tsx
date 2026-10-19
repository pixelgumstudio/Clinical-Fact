import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';
import { MedicalChatGroundingSource, MedicalChatSource } from '../../../services/api';
import { buildSourceChips } from './citationHelpers';

interface SourcesRowProps {
  sources?: MedicalChatSource[];
  webSources?: MedicalChatGroundingSource[];
  onOpen: (sources: MedicalChatSource[], webSources: MedicalChatGroundingSource[]) => void;
}

/**
 * Compact sources card under an answer: the first three sources by name, then a round "+N" for
 * the rest. Tapping anywhere on it opens the sheet with every citation and web link — it replaces
 * the old "N sources" pill plus the long "also referenced from the web" list.
 */
export const SourcesRow: React.FC<SourcesRowProps> = ({ sources = [], webSources = [], onOpen }) => {
  const { t } = useTranslation();
  const { visible, more, total } = buildSourceChips(sources, webSources);
  if (total === 0) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onOpen(sources, webSources)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('chat.sourcesRow.viewSources', { total })}
    >
      {visible.map((chip) => (
        <View key={chip.key} style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>
            {chip.label}
          </Text>
        </View>
      ))}
      {more > 0 && (
        <View style={styles.moreBadge}>
          <Text style={styles.moreText}>+{more}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: theme.spacing[2], // 8
    marginTop: theme.spacing[4], // 16
    padding: theme.spacing[2], // 8
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.lg, // 16
  },
  chip: {
    flexShrink: 1,
    maxWidth: 112,
    paddingHorizontal: theme.spacing[3], // 12
    paddingVertical: theme.spacing[1.5],
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.full,
  },
  chipText: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.grey[900],
  },
  moreBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.grey[900],
    borderRadius: theme.borderRadius.full,
  },
  moreText: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.white,
  },
});
