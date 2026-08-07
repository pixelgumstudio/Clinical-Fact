/**
 * Badge Component
 *
 * TICKET-005: Badge component for status indicators, counts, and labels
 * - Small variant: 20px height, 10px border radius
 * - Medium variant: 24px height, 12px border radius
 * - Large variant: 28px height, 14px border radius
 * - Colors: primary, success, warning, error, neutral
 * - Dot variant: Small colored circle only (8px)
 * - Number variant: Circular badge with count (99+ for overflow)
 * - Label variant: Rounded rectangle with text
 *
 * @example
 * ```tsx
 * // Number badge
 * <Badge variant="number" count={5} color="error" />
 *
 * // Dot badge
 * <Badge variant="dot" color="success" />
 *
 * // Label badge
 * <Badge variant="label" size="medium" color="primary">
 *   New
 * </Badge>
 * ```
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

export interface BadgeProps {
  /**
   * Badge variant
   * - dot: Small colored circle
   * - number: Circular badge with count
   * - label: Rounded rectangle with text
   */
  variant?: 'dot' | 'number' | 'label';

  /**
   * Badge size (not applicable to dot variant)
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Badge color
   */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';

  /**
   * Count for number variant (shows 99+ for values > 99)
   */
  count?: number;

  /**
   * Label text for label variant
   */
  children?: React.ReactNode;

  /**
   * Custom badge style
   */
  style?: ViewStyle;

  /**
   * Custom text style
   */
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'label',
  size = 'medium',
  color = 'primary',
  count = 0,
  children,
  style,
  textStyle,
}) => {
  // Get color values based on color prop
  const colorStyles = {
    primary: {
      backgroundColor: theme.colors.primary[500],
      color: theme.colors.neutral[0],
    },
    success: {
      backgroundColor: theme.colors.success.main,
      color: theme.colors.neutral[0],
    },
    warning: {
      backgroundColor: theme.colors.warning.main,
      color: theme.colors.neutral[0],
    },
    error: {
      backgroundColor: theme.colors.error.main,
      color: theme.colors.neutral[0],
    },
    neutral: {
      backgroundColor: theme.colors.neutral[500],
      color: theme.colors.neutral[0],
    },
  };

  const { backgroundColor, color: textColor } = colorStyles[color];

  // Format count display (show 99+ for counts > 99)
  const displayCount = count > 99 ? '99+' : count.toString();

  // Dot variant - Design Spec: 8px circle
  if (variant === 'dot') {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor },
          style,
        ]}
      />
    );
  }

  // Number variant - Design Spec: Circular badge
  if (variant === 'number') {
    return (
      <View
        style={[
          styles.number,
          styles[`size_${size}`],
          { backgroundColor },
          style,
        ]}
      >
        <Text
          style={[
            styles.numberText,
            styles[`numberText_${size}`],
            { color: textColor },
            textStyle,
          ]}
        >
          {displayCount}
        </Text>
      </View>
    );
  }

  // Label variant - Design Spec: Rounded rectangle
  return (
    <View
      style={[
        styles.label,
        styles[`size_${size}`],
        { backgroundColor },
        style,
      ]}
    >
      <Text
        style={[
          styles.labelText,
          styles[`labelText_${size}`],
          { color: textColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Dot variant - Design Spec: 8px circle
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Number variant - Circular badge
  number: {
    borderRadius: 9999, // Fully circular
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20, // Ensures circular shape for single digits
  },

  // Label variant - Rounded rectangle
  label: {
    borderRadius: 10, // Default for medium
    paddingHorizontal: theme.spacing[2], // 8px
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Size variants - Design Spec: Small=20px, Medium=24px, Large=28px
  size_small: {
    height: 20,
    borderRadius: 10,
    paddingHorizontal: theme.spacing[1.5], // 6px
    minWidth: 20,
  },

  size_medium: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: theme.spacing[2], // 8px
    minWidth: 24,
  },

  size_large: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10, // 10px
    minWidth: 28,
  },

  // Number text styles
  numberText: {
    fontWeight: theme.typography.fontWeight.semibold, // 600
    textAlign: 'center',
  },

  numberText_small: {
    fontSize: theme.typography.fontSize['2xs'], // 10px
  },

  numberText_medium: {
    fontSize: theme.typography.fontSize.xs, // 12px
  },

  numberText_large: {
    fontSize: theme.typography.fontSize.sm, // 14px
  },

  // Label text styles
  labelText: {
    fontWeight: theme.typography.fontWeight.medium, // 500
    textAlign: 'center',
  },

  labelText_small: {
    fontSize: theme.typography.fontSize['2xs'], // 10px
  },

  labelText_medium: {
    fontSize: theme.typography.fontSize.xs, // 12px
  },

  labelText_large: {
    fontSize: theme.typography.fontSize.sm, // 14px
  },
});

export default Badge;
