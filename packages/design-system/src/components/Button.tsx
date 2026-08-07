/**
 * Button Component
 *
 * Confirmed 2026-07-28 against real Figma button-state exports (a full
 * Normal/Hover/Focus/Pressed/Disabled state sheet, plus real screens using
 * the same component with `data-button-type="Primary"/"Secondary"`,
 * `data-size="Big"` attributes). Only `primary`/`secondary` and the sizes
 * below are confirmed by real designs — this intentionally drops the
 * previous unconfirmed `ghost`/`icon` variants, which had no callers
 * anywhere in the app.
 *
 * Known deviation from the raw export: the Disabled state in the Figma file
 * used white label text on a near-white background (`#ECF9FE`), which would
 * be unreadable. That looked like an authoring bug in the source file rather
 * than an intentional design, so disabled text uses a muted grey instead.
 *
 * `light` variant added 2026-07-29, confirmed from the onboarding hero
 * screen's "Get started" CTA (a light cream pill sitting on a dark photo
 * background) — bg linen-400, text yale-900.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onPress={handleSubmit}>Sign Up</Button>
 * <Button variant="secondary" leftIcon={<Icon name="translate" />} onPress={handleTranslate}>
 *   Translate
 * </Button>
 * ```
 */

import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { theme } from '../theme';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  /** primary: solid yale fill · secondary: white with grey border · light: cream pill for use over photo backgrounds */
  variant?: 'primary' | 'secondary' | 'light';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const SIZE_TEXT_STYLE: Record<NonNullable<ButtonProps['size']>, TextStyle> = {
  large: theme.typography.textStyles.button1,
  medium: theme.typography.textStyles.button2,
  small: theme.typography.textStyles.button3,
};

const SPINNER_COLOR: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: theme.colors.white,
  secondary: theme.colors.grey[900],
  light: theme.colors.yale[900],
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  style,
  textStyle,
  onPress,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) =>
        [
          styles.base,
          styles[`size_${size}`],
          styles[`variant_${variant}`],
          pressed && !isDisabled && styles[`variant_${variant}_pressed`],
          fullWidth && styles.fullWidth,
          isDisabled && styles[`variant_${variant}_disabled`],
          style,
        ] as ViewStyle[]
      }
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER_COLOR[variant]} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              SIZE_TEXT_STYLE[size],
              styles[`text_${variant}`],
              isDisabled && styles[`text_${variant}_disabled`],
              textStyle,
            ]}
            numberOfLines={1}
          >
            {children}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.button, // 9999 — every button is a full pill
    borderWidth: 1,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sizes — "large" (56px) is the only one confirmed by real exports;
  // small/medium interpolated from the same padding pattern.
  size_small: {
    height: theme.heights.button.small,
    paddingHorizontal: theme.spacing[3], // 12
  },
  size_medium: {
    height: theme.heights.button.medium,
    paddingHorizontal: theme.spacing[4], // 16
  },
  size_large: {
    height: theme.heights.button.large,
    paddingHorizontal: theme.spacing[5], // 20
  },

  // Primary — confirmed Normal/Focus+Pressed colors
  variant_primary: {
    backgroundColor: theme.colors.yale[700],
    borderColor: theme.colors.yale[700],
  },
  variant_primary_pressed: {
    backgroundColor: theme.colors.yale[900],
    borderColor: theme.colors.yale[900],
  },
  variant_primary_disabled: {
    backgroundColor: theme.colors.yale[50],
    borderColor: theme.colors.yale[50],
  },

  // Secondary — confirmed Normal/Hover colors
  variant_secondary: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.grey[50],
  },
  variant_secondary_pressed: {
    backgroundColor: theme.colors.grey[100],
    borderColor: theme.colors.grey[100],
  },
  variant_secondary_disabled: {
    backgroundColor: theme.colors.grey[10],
    borderColor: theme.colors.grey[50],
  },

  // Light — confirmed Normal color only; pressed/disabled interpolated
  // along the same linen scale used elsewhere for hover/pressed steps.
  variant_light: {
    backgroundColor: theme.colors.linen[400],
    borderColor: theme.colors.linen[400],
  },
  variant_light_pressed: {
    backgroundColor: theme.colors.linen[500],
    borderColor: theme.colors.linen[500],
  },
  variant_light_disabled: {
    backgroundColor: theme.colors.linen[200],
    borderColor: theme.colors.linen[200],
  },

  fullWidth: {
    width: '100%',
  },

  text_primary: {
    color: theme.colors.white,
    textAlign: 'center',
  },
  text_primary_disabled: {
    color: theme.colors.grey[400],
  },

  text_secondary: {
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  text_secondary_disabled: {
    color: theme.colors.grey[300],
  },

  text_light: {
    color: theme.colors.yale[900],
    textAlign: 'center',
  },
  text_light_disabled: {
    color: theme.colors.linen[600],
  },

  leftIcon: {
    marginRight: theme.spacing[1], // 4
  },
  rightIcon: {
    marginLeft: theme.spacing[1], // 4
  },
});

export default Button;
