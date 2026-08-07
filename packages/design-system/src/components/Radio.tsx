/**
 * Radio Component
 *
 * New component — confirmed 2026-07-28 from the same Figma checkbox/radio
 * state export as Checkbox.tsx. Shares its color/state logic exactly:
 * - Default: white fill, grey-200 border
 * - Selected: grey-900 fill, white center dot
 * - Focus/press ring: yale-900 (see Checkbox.tsx note on the leftover teal
 *   ring color found in the source file)
 * - Disabled+selected: grey-100 fill, grey-200 border/dot
 *
 * Typically used inside a RadioGroup that manages which option is selected;
 * this component itself is presentational/controlled, same pattern as Checkbox.
 *
 * @example
 * ```tsx
 * <Radio selected={value === 'a'} onSelect={() => setValue('a')} label="Option A" />
 * ```
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

export interface RadioProps {
  selected: boolean;
  onSelect: () => void;
  label?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  labelPosition?: 'left' | 'right';
}

const OUTER_SIZE: Record<NonNullable<RadioProps['size']>, number> = {
  small: 16,
  medium: 20,
  large: 24,
};

export const Radio: React.FC<RadioProps> = ({
  selected,
  onSelect,
  label,
  size = 'medium',
  disabled = false,
  style,
  labelStyle,
  labelPosition = 'right',
}) => {
  const outerSize = OUTER_SIZE[size];
  const dotSize = outerSize * 0.4;

  const handlePress = () => {
    if (!disabled) onSelect();
  };

  return (
    <Pressable
      style={[
        styles.container,
        { flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row' },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.ring,
              { width: outerSize + 8, height: outerSize + 8, borderRadius: (outerSize + 8) / 2 },
              pressed && !disabled && styles.ringVisible,
            ]}
          >
            <View
              style={[
                styles.outer,
                {
                  width: outerSize,
                  height: outerSize,
                  borderRadius: outerSize / 2,
                  backgroundColor: disabled && selected
                    ? theme.colors.grey[100]
                    : selected
                    ? theme.colors.grey[900]
                    : theme.colors.white,
                  borderColor: disabled
                    ? theme.colors.grey[200]
                    : selected
                    ? theme.colors.grey[900]
                    : pressed
                    ? theme.colors.grey[300]
                    : theme.colors.grey[200],
                },
              ]}
            >
              {selected && (
                <View
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: disabled ? theme.colors.grey[200] : theme.colors.white,
                  }}
                />
              )}
            </View>
          </View>

          {label && (
            <View style={styles.labelContainer}>
              {typeof label === 'string' ? (
                <Text
                  style={[
                    styles.label,
                    disabled && { color: theme.colors.grey[400] },
                    labelStyle,
                  ]}
                >
                  {label}
                </Text>
              ) : (
                label
              )}
            </View>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  ring: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringVisible: {
    borderColor: theme.colors.yale[900],
  },
  outer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
  },
});

export default Radio;
