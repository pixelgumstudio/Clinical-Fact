/**
 * OptionCard Component
 *
 * New component — confirmed 2026-07-29/30 across the 8-screen onboarding
 * survey exports (and matches the same selectable-answer-card pattern seen
 * earlier in quiz-question screens): a full-width card with a leading
 * selection icon, used for single-select question lists.
 * - Unselected: grey-10 fill, grey-100 border, empty ring icon (grey-200)
 * - Selected: white fill, 1.5px yale-700 border, filled check icon
 *
 * The source export's "selected" icon was literally invisible (white
 * checkmark on a white circle, no fill color survived the export) — same
 * white-on-white authoring bug pattern seen elsewhere in this project, not
 * intentional. Rebuilt using the confirmed `sucessfulFill` vector icon
 * recolored to yale-700 instead of reproducing the invisible original.
 *
 * @example
 * ```tsx
 * <OptionCard label="Medical student" selected={role === 'medical'} onPress={() => setRole('medical')} />
 * ```
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Icon } from './Icon';

export interface OptionCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({ label, selected, onPress, disabled = false }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, selected ? styles.cardSelected : styles.cardDefault, disabled && styles.cardDisabled]}
    >
      <View style={styles.iconWrap}>
        {selected ? (
          <Icon name="sucessfulFill" size={24} color={theme.colors.yale[700]} />
        ) : (
          <Icon name="unsucessful" size={24} color={theme.colors.grey[200]} />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
    borderRadius: theme.borderRadius.input, // 16
  },
  cardDefault: {
    backgroundColor: theme.colors.grey[10],
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
  },
  cardSelected: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.yale[700],
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
  },
});

export default OptionCard;
