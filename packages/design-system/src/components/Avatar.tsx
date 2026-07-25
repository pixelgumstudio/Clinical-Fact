/**
 * FILE: /mnt/project/packages/design-system/src/components/Avatar.tsx
 * 
 * Avatar Component
 * 
 * A circular avatar component for displaying user profile pictures with fallback
 * to initials when no image is provided. Supports multiple sizes and online status indicator.
 * 
 * @example
 * ```tsx
 * <Avatar
 *   source={{ uri: 'https://example.com/avatar.jpg' }}
 *   size="large"
 *   name="John Doe"
 * />
 * 
 * // With initials fallback
 * <Avatar
 *   name="John Doe"
 *   size="medium"
 *   backgroundColor={theme.colors.primary[500]}
 * />
 * 
 * // With online status
 * <Avatar
 *   source={{ uri: 'https://example.com/avatar.jpg' }}
 *   showOnlineStatus
 *   isOnline={true}
 * />
 * ```
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { theme } from '../theme';

export interface AvatarProps {
  /**
   * Image source for the avatar
   */
  source?: ImageSourcePropType;
  
  /**
   * User's name - used for generating initials when no image is provided
   */
  name?: string;
  
  /**
   * Size variant of the avatar
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  
  /**
   * Custom background color for initials
   */
  backgroundColor?: string;
  
  /**
   * Custom text color for initials
   */
  textColor?: string;
  
  /**
   * Whether to show online status indicator
   */
  showOnlineStatus?: boolean;
  
  /**
   * Online status - only shown if showOnlineStatus is true
   */
  isOnline?: boolean;
  
  /**
   * Border width
   */
  borderWidth?: number;
  
  /**
   * Border color
   */
  borderColor?: string;
}

/**
 * Get initials from a full name
 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Avatar component for displaying user profile pictures
 */
export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'medium',
  backgroundColor = theme.colors.primary[500],
  textColor = theme.colors.text.inverse,
  showOnlineStatus = false,
  isOnline = false,
  borderWidth = 0,
  borderColor = theme.colors.neutral[200],
}) => {
  // Size configurations
  const sizeConfig = {
    small: { container: 32, text: theme.typography.fontSize.sm, status: 8 },
    medium: { container: 48, text: theme.typography.fontSize.lg, status: 12 },
    large: { container: 64, text: theme.typography.fontSize.xl, status: 14 },
    xlarge: { container: 96, text: theme.typography.fontSize['2xl'], status: 18 },
  };

  const config = sizeConfig[size];
  const initials = name ? getInitials(name) : '?';

  const containerStyle = [
    styles.container,
    {
      width: config.container,
      height: config.container,
      borderRadius: config.container / 2,
      backgroundColor: source ? 'transparent' : backgroundColor,
      borderWidth,
      borderColor,
    },
  ];

  const imageStyle = {
    width: config.container,
    height: config.container,
    borderRadius: config.container / 2,
  };

  const textStyle = [
    styles.text,
    {
      fontSize: config.text,
      color: textColor,
    },
  ];

  const statusIndicatorStyle = [
    styles.statusIndicator,
    {
      width: config.status,
      height: config.status,
      borderRadius: config.status / 2,
      backgroundColor: isOnline ? theme.colors.success.main : theme.colors.neutral[400],
      borderWidth: 2,
      borderColor: theme.colors.background.primary,
    },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={containerStyle}>
        {source ? (
          <Image source={source} style={imageStyle} resizeMode="cover" />
        ) : (
          <Text style={textStyle}>{initials}</Text>
        )}
      </View>
      
      {showOnlineStatus && (
        <View style={statusIndicatorStyle} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});