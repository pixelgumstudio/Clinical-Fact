/**
 * Input Component
 *
 * Confirmed 2026-07-28 against a real Figma input-states export
 * (Normal/Hover/Focus/Pressed/Disabled/Error):
 * - Height: 56px, border radius: 16px
 * - Normal: bg grey-10, border grey-100
 * - Focus: bg white, 2px border yale-900
 * - Error: bg white, 1px border red-400 (confirmed 1px, not 2px)
 * - Disabled: bg grey-50, border grey-50, text grey-400
 * - Placeholder: grey-300 · filled text: grey-900
 *
 * The source export's "Pressed" row showed dark filled-in text rather than a
 * literal touch-down state, so it's treated here as what the field looks
 * like once it has a value, not a transient press state.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   value={email}
 *   onChangeText={setEmail}
 *   error={emailError}
 *   leftIcon={<EmailIcon />}
 * />
 * ```
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

export interface InputProps extends TextInputProps {
  /**
   * Input label
   */
  label?: string;

  /**
   * Helper text below input
   */
  helperText?: string;

  /**
   * Error message
   */
  error?: string;

  /**
   * Success state (shows green border)
   */
  success?: boolean;

  /**
   * Input size
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Show required asterisk
   */
  required?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Left icon component (16x16px recommended)
   */
  leftIcon?: React.ReactNode;

  /**
   * Right icon component (16x16px recommended)
   */
  rightIcon?: React.ReactNode;

  /**
   * Show password toggle for secure text entry
   */
  showPasswordToggle?: boolean;

  /**
   * Character counter max length
   */
  maxLength?: number;

  /**
   * Show character counter
   */
  showCharacterCount?: boolean;

  /**
   * Container style
   */
  containerStyle?: ViewStyle;

  /**
   * Input container style
   */
  inputContainerStyle?: ViewStyle;

  /**
   * Input text style
   */
  inputStyle?: TextStyle;

  /**
   * Label style
   */
  labelStyle?: TextStyle;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  helperText,
  error,
  success = false,
  size = 'large',
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  showPasswordToggle = false,
  secureTextEntry = false,
  maxLength,
  showCharacterCount = false,
  value = '',
  containerStyle,
  inputContainerStyle,
  inputStyle,
  labelStyle,
  onFocus,
  onBlur,
  ...rest
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const hasError = !!error;
  const showError = hasError && !isFocused;

  // Determine input container styles - Design Spec compliant
  const containerStyles = [
    styles.inputContainer,
    styles[`size_${size}`],
    isFocused && styles.inputContainerFocused,
    hasError && styles.inputContainerError,
    success && !hasError && !isFocused && styles.inputContainerSuccess,
    disabled && styles.inputContainerDisabled,
    inputContainerStyle,
  ] as ViewStyle[];

  // Determine input text styles
  const textStyles = [
    styles.input,
    styles[`input_${size}`],
    disabled && styles.inputDisabled,
    inputStyle,
  ] as TextStyle[];

  // Handle password visibility toggle
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Determine if secure text entry should be applied
  const isSecure = secureTextEntry && !isPasswordVisible;

  // Character count
  const characterCount = value?.toString().length || 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {showCharacterCount && maxLength && (
            <Text style={styles.characterCount}>
              {characterCount}/{maxLength}
            </Text>
          )}
        </View>
      )}

      {/* Input Container */}
      <View style={containerStyles}>
        {/* Left Icon */}
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        {/* Text Input */}
        <TextInput
          ref={ref}
          style={textStyles}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          editable={!disabled}
          placeholderTextColor={theme.colors.grey[300]}
          secureTextEntry={isSecure}
          value={value}
          maxLength={maxLength}
          {...rest}
        />

        {/* Right Icon or Password Toggle */}
        {showPasswordToggle && secureTextEntry ? (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.toggleText}>
              {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>

      {/* Helper Text or Error */}
      {(helperText || error) && (
        <View style={styles.helperContainer}>
          {showError ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : helperText ? (
            <Text style={styles.helperText}>{helperText}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2], // 8px
  },

  label: {
    fontSize: theme.typography.fontSize.sm, // 14px
    fontWeight: theme.typography.fontWeight.medium, // 500
    color: theme.colors.text.primary, // #111827
  },

  required: {
    color: theme.colors.error.main, // #EF4444
  },

  characterCount: {
    fontSize: theme.typography.fontSize.xs, // 12px
    color: theme.colors.text.secondary, // #6B7280
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.grey[10],
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.input, // 16px
  },

  // Focus — confirmed: white bg, 2px yale-900 border
  inputContainerFocused: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.yale[900],
    borderWidth: 2,
  },

  // Error — confirmed: white bg, 1px red-400 border (not 2px)
  inputContainerError: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.red[400],
    borderWidth: 1,
  },

  // Success — not directly confirmed by an export; reuses the confirmed green scale
  inputContainerSuccess: {
    borderColor: theme.colors.green[600],
    borderWidth: 2,
  },

  // Disabled — confirmed: grey-50 bg + border
  inputContainerDisabled: {
    backgroundColor: theme.colors.grey[50],
    borderColor: theme.colors.grey[50],
  },

  // Size variants - Design Spec: Large = 56px height
  size_small: {
    paddingHorizontal: theme.spacing[3], // 12px
    minHeight: 40,
  },

  size_medium: {
    paddingHorizontal: theme.spacing[4], // 16px
    minHeight: 48,
  },

  size_large: {
    paddingHorizontal: theme.spacing[4], // 16px
    minHeight: 56, // Design Spec: 56px
  },

  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.base, // 16px
    color: theme.colors.grey[900],
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: theme.typography.fontWeight.regular,
    paddingVertical: theme.spacing[4], // 16px for better touch target
  },

  input_small: {
    fontSize: theme.typography.fontSize.sm, // 14px
    paddingVertical: theme.spacing[2], // 8px
  },

  input_medium: {
    fontSize: theme.typography.fontSize.base, // 16px
    paddingVertical: theme.spacing[3], // 12px
  },

  input_large: {
    fontSize: theme.typography.fontSize.base, // 16px
    paddingVertical: theme.spacing[4], // 16px
  },

  // Disabled text — confirmed grey-400
  inputDisabled: {
    color: theme.colors.grey[400],
  },

  // Icon spacing - Design Spec: 12px spacing from text
  leftIcon: {
    marginRight: theme.spacing[3], // 12px
  },

  rightIcon: {
    marginLeft: theme.spacing[3], // 12px
  },

  toggleText: {
    fontSize: theme.typography.fontSize.lg, // 18px
  },

  helperContainer: {
    marginTop: theme.spacing[1], // 4px
  },

  helperText: {
    fontSize: theme.typography.fontSize.xs, // 12px
    color: theme.colors.text.secondary, // #6B7280
  },

  errorText: {
    fontSize: theme.typography.fontSize.xs, // 12px
    color: theme.colors.error.main, // #EF4444
  },
});

export default Input;
