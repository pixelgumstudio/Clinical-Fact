/**
 * Checkbox Component
 *
 * Confirmed 2026-07-28 against a real Figma checkbox/radio state export
 * (Default/Hover/Focused/Checked/Disabled/Indeterminate):
 * - Box: 20px, 4px corner radius
 * - Default: white fill, grey-200 border
 * - Checked: grey-900 fill, white checkmark
 * - Focus/press ring: yale-900 (the source file used a leftover teal ring
 *   color from an unrelated template — confirmed as unintentional, swapped
 *   to the app's actual focus color to match Input's focus border)
 * - Disabled+checked: grey-100 fill, grey-200 border/checkmark
 * - Hover border harmonized to the Radio component's grey-300 (the raw
 *   export had checkbox and radio disagreeing on this value; grey-300 is the
 *   one that matches a real palette step)
 *
 * @example
 * ```tsx
 * <Checkbox checked={agreed} onChange={setAgreed} label="I agree to terms and conditions" />
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { theme } from '../theme';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Shows a dash instead of a checkmark, for "some but not all" selections */
  indeterminate?: boolean;
  label?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  error?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  labelPosition?: 'left' | 'right';
}

const BOX_SIZE: Record<NonNullable<CheckboxProps['size']>, number> = {
  small: 16,
  medium: 20,
  large: 24,
};

const CheckIcon: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 12 10" fill="none">
    <Path
      d="M1 5L4.2 8.5L11 1"
      stroke={theme.colors.white}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DashIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <Line x1="2" y1="6" x2="10" y2="6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  indeterminate = false,
  label,
  size = 'medium',
  disabled = false,
  error,
  style,
  labelStyle,
  labelPosition = 'right',
}) => {
  const boxSize = BOX_SIZE[size];
  const hasError = !!error;
  const isMarked = checked || indeterminate;

  const handlePress = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <View style={styles.wrapper}>
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
                {
                  width: boxSize + 8,
                  height: boxSize + 8,
                  borderRadius: theme.borderRadius.checkbox + 4,
                },
                pressed && !disabled && styles.ringVisible,
              ]}
            >
              <View
                style={[
                  styles.box,
                  {
                    width: boxSize,
                    height: boxSize,
                    borderRadius: theme.borderRadius.checkbox,
                    backgroundColor: disabled && isMarked
                      ? theme.colors.grey[100]
                      : isMarked
                      ? theme.colors.grey[900]
                      : theme.colors.white,
                    borderColor: hasError
                      ? theme.colors.red[600]
                      : disabled
                      ? theme.colors.grey[200]
                      : isMarked
                      ? theme.colors.grey[900]
                      : pressed
                      ? theme.colors.grey[300]
                      : theme.colors.grey[200],
                  },
                ]}
              >
                {indeterminate ? (
                  <DashIcon
                    size={boxSize * 0.5}
                    color={disabled ? theme.colors.grey[200] : theme.colors.white}
                  />
                ) : checked ? (
                  <CheckIcon size={boxSize * 0.5} />
                ) : null}
              </View>
            </View>

            {label && (
              <View style={styles.labelContainer}>
                {typeof label === 'string' ? (
                  <Text
                    style={[
                      styles.label,
                      hasError && { color: theme.colors.red[600] },
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

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: theme.spacing[1],
  },
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
  box: {
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
  errorText: {
    marginTop: theme.spacing[1],
    marginLeft: theme.spacing[7],
    ...theme.typography.textStyles.caption1,
    color: theme.colors.red[600],
  },
});

export default Checkbox;
