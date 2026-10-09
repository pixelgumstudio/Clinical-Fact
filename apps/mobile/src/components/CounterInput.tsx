import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon, theme } from '@clinicalfact/design-system';

interface CounterInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  /** Formats the value for display when the field isn't focused — e.g. minutes -> "10:00".
   *  Defaults to the plain number. While focused, the raw editable number is shown instead,
   *  regardless of this — you can't usefully type into a formatted "10:00" string. */
  formatDisplay?: (value: number) => string;
}

/** The "− [[editable number]] +" stepper used by CreateQuizModal/CreateFlashcardsModal for
 *  question count and quiz time — the number is a real TextInput (tap in and type a value
 *  directly) as well as steppable via the +/- buttons. */
export const CounterInput: React.FC<CounterInputProps> = ({
  value,
  onChange,
  min,
  max,
  disabled = false,
  formatDisplay,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(String(value));

  const displayText = isEditing ? draftText : (formatDisplay ? formatDisplay(value) : String(value));

  const commitDraft = (text: string) => {
    const parsed = parseInt(text, 10);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    onChange(next);
  };

  return (
    <View style={styles.counterContainer}>
      <TouchableOpacity
        style={styles.counterButton}
        onPress={() => onChange(Math.max(min, value - 1))}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Icon name="remove" size={24} color={theme.colors.grey[900]} />
      </TouchableOpacity>

      <View style={styles.counterValue}>
        <TextInput
          style={styles.counterValueText}
          value={displayText}
          keyboardType="number-pad"
          textAlign="center"
          editable={!disabled}
          selectTextOnFocus
          onFocus={() => {
            setDraftText(String(value));
            setIsEditing(true);
          }}
          onChangeText={(text) => setDraftText(text.replace(/[^0-9]/g, ''))}
          onBlur={() => {
            setIsEditing(false);
            commitDraft(draftText);
          }}
        />
      </View>

      <TouchableOpacity
        style={styles.counterButton}
        onPress={() => onChange(Math.min(max, value + 1))}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Icon name="add" size={24} color={theme.colors.grey[900]} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[6], // 24
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    width: 130,
    paddingVertical: theme.spacing[3], // 12
    paddingHorizontal: theme.spacing[4], // 16
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValueText: {
    width: '100%',
    padding: 0,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '600',
    color: theme.colors.grey[900],
  },
});
