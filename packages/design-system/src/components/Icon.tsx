/**
 * FILE: /mnt/project/packages/design-system/src/components/Icon.tsx
 * 
 * Icon Component
 * 
 * A wrapper component for icons with consistent sizing and colors.
 * Works with any icon library (react-native-vector-icons, @expo/vector-icons, etc.)
 * 
 * @example
 * ```tsx
 * <Icon name="mail" size="medium" color="primary" />
 * <Icon name="check-circle" size="large" color="success" />
 * ```
 * 
 * @dependencies
 * - This is a wrapper. You need to install an icon library like:
 *   - @expo/vector-icons
 *   - react-native-vector-icons
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

export interface IconProps {
  /**
   * Icon name (depends on icon library)
   */
  name: string;

  /**
   * Icon size
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

  /**
   * Icon color from theme or custom hex
   */
  color?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'text'
    | 'textSecondary'
    | 'inverse'
    | string;

  /**
   * Icon library component (e.g., MaterialIcons, Ionicons)
   */
  IconComponent?: React.ComponentType<any>;

  /**
   * Custom container style
   */
  style?: ViewStyle;
}

// Icon size mapping
const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
};

// Icon color mapping
const getIconColor = (color: string): string => {
  const colorMap: Record<string, string> = {
    primary: theme.colors.primary[500],
    secondary: theme.colors.secondary[500],
    success: theme.colors.success.main,
    error: theme.colors.error.main,
    warning: theme.colors.warning.main,
    info: theme.colors.info.main,
    text: theme.colors.text.primary,
    textSecondary: theme.colors.text.secondary,
    inverse: theme.colors.text.inverse,
  };

  return colorMap[color] || color;
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'text',
  IconComponent,
  style,
}) => {
  const iconSize = typeof size === 'number' ? size : iconSizes[size];
  const iconColor = getIconColor(color);

  // If IconComponent is provided, render it
  if (IconComponent) {
    return (
      <View style={style}>
        <IconComponent name={name} size={iconSize} color={iconColor} />
      </View>
    );
  }

  // Fallback: render a placeholder
  // In real app, this should import a default icon library
  return (
    <View
      style={[
        styles.placeholder,
        {
          width: iconSize,
          height: iconSize,
          backgroundColor: iconColor,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: theme.borderRadius.sm,
    opacity: 0.3,
  },
});

export default Icon;