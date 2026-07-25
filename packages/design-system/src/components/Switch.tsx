/**
 * FILE: /mnt/project/packages/design-system/src/components/Switch.tsx
 * 
 * Switch Component
 * 
 * A toggle switch component for binary settings.
 * Provides smooth animations and accessibility support.
 * 
 * @example
 * ```tsx
 * <Switch
 *   value={notificationsEnabled}
 *   onValueChange={setNotificationsEnabled}
 *   label="Enable Notifications"
 * />
 * 
 * <Switch
 *   value={darkMode}
 *   onValueChange={setDarkMode}
 *   label="Dark Mode"
 *   disabled
 * />
 * ```
 */

import React from 'react';
import {
  View,
  Switch as RNSwitch,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { theme } from '../theme';

export interface SwitchProps {
  /**
   * Switch value (on/off)
   */
  value: boolean;

  /**
   * Value change handler
   */
  onValueChange: (value: boolean) => void;

  /**
   * Label text
   */
  label?: string;

  /**
   * Description text below label
   */
  description?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Active color (when on)
   */
  activeColor?: string;

  /**
   * Inactive color (when off)
   */
  inactiveColor?: string;

  /**
   * Thumb color
   */
  thumbColor?: string;

  /**
   * Container style
   */
  style?: ViewStyle;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  activeColor = theme.colors.primary[500],
  inactiveColor = theme.colors.neutral[300],
  thumbColor = theme.colors.neutral[0],
  style,
}) => {
  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      {/* Label and Description */}
      {(label || description) && (
        <View style={styles.textContainer}>
          {label && (
            <Text
              variant="body1"
              color={disabled ? 'disabled' : 'primary'}
              weight="medium"
            >
              {label}
            </Text>
          )}
          {description && (
            <Text
              variant="caption"
              color={disabled ? 'disabled' : 'secondary'}
              style={styles.description}
            >
              {description}
            </Text>
          )}
        </View>
      )}

      {/* Switch */}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: inactiveColor,
          true: activeColor,
        }}
        thumbColor={thumbColor}
        ios_backgroundColor={inactiveColor}
        style={Platform.select({
          ios: styles.switchIOS,
          android: styles.switchAndroid,
        })}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
  },

  textContainer: {
    flex: 1,
    marginRight: theme.spacing[3],
  },

  description: {
    marginTop: theme.spacing[1],
  },

  switchIOS: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },

  switchAndroid: {
    // Android switch styling if needed
  },
});

export default Switch;