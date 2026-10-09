import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '@clinicalfact/design-system';
import { MedicalChatSource } from '../../../services/api';
import { groupSourcesForPills } from './citationHelpers';

interface CitationPillsRowProps {
  sources: MedicalChatSource[];
  onOpenCitations: (sources: MedicalChatSource[]) => void;
  style?: StyleProp<ViewStyle>;
}

/** Grouped citation pills ("Journal +3" / "FDA +1" / "Attached +2"). Each pill opens the
 *  citations sheet filtered to just its own group, not every source in the message — used both
 *  under an individual RichText block and under a whole message (see ChatMessageBubble). */
export const CitationPillsRow: React.FC<CitationPillsRowProps> = ({ sources, onOpenCitations, style }) => {
  if (!sources.length) return null;

  return (
    <View style={[styles.citationPillsRow, style]}>
      {groupSourcesForPills(sources).map((group) => (
        <TouchableOpacity
          key={group.label}
          style={styles.citationPill}
          onPress={() => onOpenCitations(group.sources)}
          activeOpacity={0.7}
        >
          <Text style={styles.citationPillText}>{group.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  citationPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2], // 8
    marginTop: theme.spacing[4], // 16
  },
  citationPill: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[2], // 8
    paddingVertical: theme.spacing[2], // 8
  },
  citationPillText: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 12,
    color: theme.colors.grey[900],
  },
});
