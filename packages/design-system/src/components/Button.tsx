/**
 * Button Component
 *
 * TICKET-002: Updated to match design specifications
 * - Height: 56px
 * - Border radius: 28px
 * - Padding horizontal: 32px
 * - Font size: 16px, weight: 600
 * - Variants: primary, secondary, ghost, icon
 * - Disabled state: 40% opacity
 * - Loading state: spinner + disabled
 * - Press animation: scale 0.98
 *
 * @example
 * ```tsx
 * <Button variant="primary" onPress={handleSubmit}>
 *   Continue
 * </Button>
 *
 * <Button variant="ghost" onPress={handleCancel}>
 *   Cancel
 * </Button>
 *
 * <Button variant="icon" onPress={handleMore}>
 *   <MoreIcon />
 * </Button>
 * ```
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Animated,
} from 'react-native';
import { theme } from '../theme';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /**
   * Button variant
   * - primary: Solid black background (#1F2937)
   * - secondary: White background with border
   * - ghost: Transparent, text only
   * - icon: Square icon button (48x48px)
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';

  /**
   * Button size
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Loading state - shows spinner
   */
  loading?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Full width button
   */
  fullWidth?: boolean;

  /**
   * Icon to show before text
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to show after text
   */
  rightIcon?: React.ReactNode;

  /**
   * Button content (text or icon for icon variant)
   */
  children: React.ReactNode;

  /**
   * Custom button style
   */
  style?: ViewStyle;

  /**
   * Custom text style
   */
  textStyle?: TextStyle;
}

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
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Handle press in animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  // Handle press out animation
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  // Get button styles based on variant and size
  const buttonStyle = [
    styles.base,
    variant !== 'icon' && styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ] as ViewStyle[];

  // Get text styles based on variant and size
  const textStyles = [
    styles.text,
    variant !== 'icon' && styles[`text_${size}`],
    styles[`text_${variant}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ] as TextStyle[];

  // Loading spinner color based on variant
  const spinnerColor = variant === 'secondary' || variant === 'ghost'
    ? theme.colors.neutral[800]
    : theme.colors.neutral[0];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={buttonStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : variant === 'icon' ? (
          <View style={styles.iconContent}>{children}</View>
        ) : (
          <View style={styles.content}>
            {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
            <Text style={textStyles} numberOfLines={1}>
              {children}
            </Text>
            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.button, // 28px
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sizes - Design Spec: Large = 56px height, Medium = 48px, Small = 40px
  size_small: {
    paddingVertical: theme.spacing[2], // 8px
    paddingHorizontal: theme.spacing[4], // 16px
    minHeight: 40,
  },

  size_medium: {
    paddingVertical: theme.spacing[3], // 12px
    paddingHorizontal: theme.spacing[6], // 24px
    minHeight: 48,
  },

  size_large: {
    paddingVertical: theme.spacing[4], // 16px
    paddingHorizontal: theme.spacing[8], // 32px
    minHeight: 56,
  },

  // Variants - Design Spec Requirements
  variant_primary: {
    backgroundColor: theme.colors.neutral[800], // #1F2937 (Black)
    ...theme.shadows.sm,
  },

  variant_secondary: {
    backgroundColor: theme.colors.neutral[0], // White
    borderWidth: 1,
    borderColor: theme.colors.border.main, // #E5E7EB
  },

  variant_ghost: {
    backgroundColor: 'transparent',
  },

  variant_icon: {
    backgroundColor: 'transparent',
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.xl, // 16px for icon buttons
    padding: theme.spacing[3], // 12px
    minHeight: 48,
  },

  // Disabled state - Design Spec: 40% opacity
  disabled: {
    opacity: 0.4,
  },

  // Full width
  fullWidth: {
    width: '100%',
  },

  // Text styles - Design Spec: 16px, 600 weight
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0,
  },

  text_small: {
    fontSize: theme.typography.fontSize.sm, // 14px
  },

  text_medium: {
    fontSize: theme.typography.fontSize.base, // 16px
  },

  text_large: {
    fontSize: theme.typography.fontSize.base, // 16px
  },

  // Text color variants
  text_primary: {
    color: theme.colors.text.inverse, // White
  },

  text_secondary: {
    color: theme.colors.neutral[800], // Black
  },

  text_ghost: {
    color: theme.colors.neutral[800], // Black
  },

  text_icon: {
    color: theme.colors.neutral[800],
  },

  textDisabled: {
    // Opacity handled by parent disabled style
  },

  // Icon spacing
  leftIcon: {
    marginRight: theme.spacing[2], // 8px
  },

  rightIcon: {
    marginLeft: theme.spacing[2], // 8px
  },
});

export default Button;
