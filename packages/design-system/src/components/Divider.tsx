/**
 * Divider Component
 *
 * TICKET-008: Simple Divider component for separating content
 * - Horizontal variant: 1px height, full width
 * - Vertical variant: 1px width, full height
 * - Color: #E5E7EB (default), #F3F4F6 (light)
 * - Spacing: 16px margin vertical (horizontal divider)
 * - Optional label: Text in center with divider on sides
 *
 * @example
 * ```tsx
 * // Basic horizontal divider
 * <Divider />
 *
 * // With label
 * <Divider label="OR" />
 *
 * // Vertical divider
 * <Divider orientation="vertical" height={40} />
 *
 * // Light color variant
 * <Divider variant="light" />
 * ```
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { theme } from '../theme';

export interface DividerProps {
  /**
   * Orientation of the divider
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Color variant
   * - default: #E5E7EB
   * - light: #F3F4F6
   */
  variant?: 'default' | 'light';

  /**
   * Optional label to display in the middle (horizontal only)
   */
  label?: string;

  /**
   * Thickness of the divider line
   */
  thickness?: number;

  /**
   * Custom color (overrides variant)
   */
  color?: string;

  /**
   * Spacing around the divider
   */
  spacing?: number;

  /**
   * Height for vertical dividers
   */
  height?: DimensionValue;

  /**
   * Width for horizontal dividers (defaults to 100%)
   */
  width?: DimensionValue;

  /**
   * Custom container style
   */
  style?: ViewStyle;

  /**
   * Text color for label
   */
  labelColor?: string;
}

/**
 * Divider component for visual separation
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'default',
  label,
  thickness = 1,
  color,
  spacing = theme.spacing[4], // 16px - Design Spec
  height = 24,
  width = '100%',
  style,
  labelColor = theme.colors.text.secondary,
}) => {
  const isHorizontal = orientation === 'horizontal';

  // Color variants - Design Spec
  const colorVariants = {
    default: theme.colors.border.main, // #E5E7EB
    light: theme.colors.border.light, // #F3F4F6
  };

  const dividerColor = color || colorVariants[variant];

  if (isHorizontal) {
    if (label) {
      // Horizontal divider with label in center
      return (
        <View style={[styles.horizontalContainer, { marginVertical: spacing }, style]}>
          <View style={[styles.line, { height: thickness, backgroundColor: dividerColor, flex: 1 }]} />
          <Text style={[styles.label, { color: labelColor, marginHorizontal: theme.spacing[3] }]}>
            {label}
          </Text>
          <View style={[styles.line, { height: thickness, backgroundColor: dividerColor, flex: 1 }]} />
        </View>
      );
    }

    // Simple horizontal divider
    return (
      <View
        style={[
          styles.line,
          {
            height: thickness,
            backgroundColor: dividerColor,
            marginVertical: spacing,
            width,
          },
          style,
        ]}
      />
    );
  }

  // Vertical divider
  return (
    <View
      style={[
        styles.line,
        {
          width: thickness,
          backgroundColor: dividerColor,
          height,
          marginHorizontal: spacing,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  line: {
    backgroundColor: theme.colors.border.main, // #E5E7EB - Design Spec
  },

  label: {
    fontSize: theme.typography.fontSize.sm, // 14px
    fontWeight: theme.typography.fontWeight.medium, // 500
    color: theme.colors.text.secondary, // #6B7280
  },
});

export default Divider;
