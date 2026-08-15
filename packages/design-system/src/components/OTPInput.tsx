/**
 * FILE: /mnt/project/packages/design-system/src/components/OTPInput.tsx
 * 
 * OTPInput Component
 * 
 * A specialized input component for entering OTP (One-Time Password) verification codes.
 * Displays separate boxes for each digit with automatic focus management.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <OTPInput
 *   length={6}
 *   value={otpCode}
 *   onChange={setOtpCode}
 * />
 * 
 * // With error state
 * <OTPInput
 *   length={6}
 *   value={otpCode}
 *   onChange={setOtpCode}
 *   error="Invalid code"
 * />
 * 
 * // Auto submit on complete
 * <OTPInput
 *   length={6}
 *   value={otpCode}
 *   onChange={setOtpCode}
 *   onComplete={(code) => handleVerify(code)}
 * />
 * ```
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  Keyboard,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../theme';

export interface OTPInputProps {
  /**
   * Length of the OTP code
   */
  length?: number;
  
  /**
   * Current OTP value
   */
  value: string;
  
  /**
   * Callback when OTP value changes
   */
  onChange: (value: string) => void;
  
  /**
   * Callback when OTP is complete
   */
  onComplete?: (value: string) => void;
  
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Whether to auto-focus on mount
   */
  autoFocus?: boolean;
  
  /**
   * Custom container style
   */
  style?: ViewStyle;
  
  /**
   * Size variant
   */
  size?: 'medium' | 'large';
}

/**
 * OTP Input component for verification codes
 */
export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error,
  autoFocus = true,
  style,
  size = 'medium',
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);
  const lastCompletedValueRef = useRef<string>('');

  // Size configurations — "medium" (48x56) confirmed 2026-07-29 against the
  // real OTP screen export; "large" is an unconfirmed larger alternative.
  const sizeConfig = {
    medium: {
      width: 48,
      height: 56,
      fontSize: theme.typography.fontSize.base,
    },
    large: {
      width: 56,
      height: 64,
      fontSize: theme.typography.fontSize['2xl'],
    },
  };

  const config = sizeConfig[size];

  // Ensure value is not longer than length
  const sanitizedValue = value.slice(0, length);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  // Handle completion - only trigger once per unique complete value
  useEffect(() => {
    if (
      sanitizedValue.length === length &&
      onComplete &&
      sanitizedValue !== lastCompletedValueRef.current
    ) {
      lastCompletedValueRef.current = sanitizedValue;
      onComplete(sanitizedValue);
    }
    // Reset the ref if value becomes incomplete (user is editing)
    if (sanitizedValue.length < length) {
      lastCompletedValueRef.current = '';
    }
  }, [sanitizedValue, length, onComplete]);

  const handleChange = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '');

    if (digit.length === 0) {
      // Handle backspace
      const newValue = sanitizedValue.slice(0, index) + sanitizedValue.slice(index + 1);
      onChange(newValue);
      
      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (digit.length === 1) {
      // Handle single digit
      const newValue =
        sanitizedValue.slice(0, index) + digit + sanitizedValue.slice(index + 1);
      onChange(newValue);
      
      // Move to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // Last digit entered, dismiss keyboard
        Keyboard.dismiss();
      }
    } else {
      // Handle paste of multiple digits
      const digits = digit.slice(0, length);
      onChange(digits);
      
      // Focus last input or dismiss keyboard
      const nextIndex = Math.min(digits.length, length - 1);
      if (nextIndex < length - 1) {
        inputRefs.current[nextIndex + 1]?.focus();
      } else {
        Keyboard.dismiss();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace when input is empty
    if (e.nativeEvent.key === 'Backspace' && !sanitizedValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputsContainer}>
        {Array.from({ length }).map((_, index) => {
          const isFocused = focusedIndex === index;
          const hasError = !!error;

          const boxStyle = [
            styles.inputBox,
            {
              width: config.width,
              height: config.height,
              borderColor: hasError
                ? theme.colors.red[600]
                : isFocused
                ? theme.colors.yale[900]
                : theme.colors.grey[100],
              borderWidth: isFocused ? 2 : 1,
            },
            disabled && styles.disabledBox,
          ];

          const textStyle = [
            styles.inputText,
            {
              fontSize: config.fontSize,
            },
          ];

          return (
            <TouchableOpacity
              key={index}
              onPress={() => {
                inputRefs.current[index]?.focus();
              }}
              activeOpacity={0.7}
              style={[boxStyle, index > 0 && { marginLeft: theme.spacing[3] }]}
            >
              <TextInput
                ref={(ref) => {
                  if (ref) inputRefs.current[index] = ref;
                }}
                style={textStyle}
                value={sanitizedValue[index] || ''}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => handleFocus(index)}
                onBlur={handleBlur}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!disabled}
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : undefined}
                textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
                importantForAutofill={Platform.OS === 'android' ? 'yes' : undefined}
                autoFocus={autoFocus && index === 0}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBox: {
    borderRadius: theme.borderRadius.input, // 16, confirmed
    backgroundColor: theme.colors.grey[10],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Prevent TextInput from overflowing on Android
  },
  disabledBox: {
    backgroundColor: theme.colors.grey[50],
    opacity: theme.opacity.disabled,
  },
  inputText: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.yale[900],
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
    margin: 0,
    // Android-specific fixes
    ...(Platform.OS === 'android' && {
      includeFontPadding: false,
      textAlignVertical: 'center',
    }),
  },
  errorText: {
    marginTop: theme.spacing[2],
    ...theme.typography.textStyles.p2,
    color: theme.colors.red[600],
    textAlign: 'center',
  },
});