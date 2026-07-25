/**
 * FILE: /mnt/project/packages/design-system/src/components/Checkbox.tsx
 * 
 * Checkbox Component
 * 
 * A checkbox input component with label, error state, and custom styling.
 * Supports different sizes and can be used in forms for terms acceptance,
 * settings toggles, and multi-select lists.
 * 
 * @example
 * ```tsx
 * // Basic checkbox
 * <Checkbox
 *   checked={agreed}
 *   onChange={setAgreed}
 *   label="I agree to terms and conditions"
 * />
 * 
 * // With error state
 * <Checkbox
 *   checked={accepted}
 *   onChange={setAccepted}
 *   label="Accept privacy policy"
 *   error="You must accept to continue"
 * />
 * 
 * // Disabled checkbox
 * <Checkbox
 *   checked={true}
 *   onChange={() => {}}
 *   label="This option is locked"
 *   disabled
 * />
 * 
 * // Different sizes
 * <Checkbox
 *   checked={checked}
 *   onChange={setChecked}
 *   label="Small checkbox"
 *   size="small"
 * />
 * 
 * // Custom colors
 * <Checkbox
 *   checked={checked}
 *   onChange={setChecked}
 *   label="Custom color"
 *   checkedColor={theme.colors.success.main}
 * />
 * 
 * // With link in label
 * <Checkbox
 *   checked={agreed}
 *   onChange={setAgreed}
 *   label={
 *     <Text>
 *       I agree to the{' '}
 *       <Text style={{ color: theme.colors.primary[500] }} onPress={openTerms}>
 *         Terms and Conditions
 *       </Text>
 *     </Text>
 *   }
 * />
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

export interface CheckboxProps {
  /**
   * Whether the checkbox is checked
   */
  checked: boolean;
  
  /**
   * Callback when checkbox is toggled
   */
  onChange: (checked: boolean) => void;
  
  /**
   * Label text or component to display next to checkbox
   */
  label?: React.ReactNode;
  
  /**
   * Size variant
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;
  
  /**
   * Error message to display below
   */
  error?: string;
  
  /**
   * Color when checked
   */
  checkedColor?: string;
  
  /**
   * Color when unchecked
   */
  uncheckedColor?: string;
  
  /**
   * Custom container style
   */
  style?: ViewStyle;
  
  /**
   * Custom label style
   */
  labelStyle?: TextStyle;
  
  /**
   * Position of the label relative to checkbox
   */
  labelPosition?: 'left' | 'right';
}

/**
 * Checkmark icon component
 */
const CheckmarkIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <Text style={{ fontSize: size, color, lineHeight: size }}>✓</Text>
);

/**
 * Checkbox component for form inputs
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  size = 'medium',
  disabled = false,
  error,
  checkedColor = theme.colors.primary[500],
  uncheckedColor = theme.colors.neutral[300],
  style,
  labelStyle,
  labelPosition = 'right',
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      box: 16,
      checkmark: 12,
      fontSize: theme.typography.fontSize.sm,
      gap: theme.spacing[2],
    },
    medium: {
      box: 20,
      checkmark: 14,
      fontSize: theme.typography.fontSize.base,
      gap: theme.spacing[2],
    },
    large: {
      box: 24,
      checkmark: 18,
      fontSize: theme.typography.fontSize.lg,
      gap: theme.spacing[3],
    },
  };

  const config = sizeConfig[size];
  const hasError = !!error;

  const boxStyle = [
    styles.checkbox,
    {
      width: config.box,
      height: config.box,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 2,
      borderColor: hasError
        ? theme.colors.error.main
        : checked
        ? checkedColor
        : uncheckedColor,
      backgroundColor: checked ? checkedColor : 'transparent',
    },
    disabled && styles.disabledBox,
  ];

  const containerStyle: ViewStyle[] = [
    styles.container,
    {
      opacity: disabled ? theme.opacity.disabled : 1,
      flexDirection: (labelPosition === 'left' ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
      gap: config.gap,
    },
    ...(style ? [style] : []),
  ];

  const textStyle = [
    styles.label,
    {
      fontSize: config.fontSize,
      color: hasError ? theme.colors.error.main : theme.colors.text.primary,
    },
    labelStyle,
  ];

  const handlePress = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={containerStyle}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={boxStyle}>
          {checked && (
            <CheckmarkIcon
              size={config.checkmark}
              color={theme.colors.text.inverse}
            />
          )}
        </View>

        {label && (
          <View style={styles.labelContainer}>
            {typeof label === 'string' ? (
              <Text style={textStyle}>{label}</Text>
            ) : (
              label
            )}
          </View>
        )}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: theme.spacing[1],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  disabledBox: {
    opacity: theme.opacity.disabled,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.relaxed,
  },
  errorText: {
    marginTop: theme.spacing[1],
    marginLeft: theme.spacing[7],
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error.main,
  },
});