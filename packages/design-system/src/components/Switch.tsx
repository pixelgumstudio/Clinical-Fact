/**
 * Switch Component
 *
 * Confirmed 2026-07-28 against the real toggle SVG exports
 * ("Icon type=Switch on/off, State=Default/Disabled/Focused/hover"):
 * - Track: 32x18, fully rounded (rx 9) · Thumb: 14x14 circle
 * - On: track yale-700, white thumb
 * - Off: track a light custom grey (`#DEDEE0` — consistently used across
 *   every off-state export, not a one-off, so kept as a literal rather than
 *   snapped to the nearest palette step)
 * - Disabled: track goes white/near-white with a faint border, thumb turns
 *   the same muted `#DEDEE0` grey
 *
 * Built as a fully custom component rather than wrapping React Native's
 * built-in Switch, since the built-in control can't reproduce this exact
 * track/thumb sizing and coloring (and renders differently per platform).
 *
 * @example
 * ```tsx
 * <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} label="Enable Notifications" />
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { theme } from '../theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const TRACK_WIDTH = 32;
const TRACK_HEIGHT = 18;
const THUMB_SIZE = 14;
const THUMB_INSET = 2;
const OFF_TRACK_COLOR = '#DEDEE0';

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  style,
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const handlePress = () => {
    if (!disabled) onValueChange(!value);
  };

  const trackColor = disabled
    ? theme.colors.white
    : anim.interpolate({ inputRange: [0, 1], outputRange: [OFF_TRACK_COLOR, theme.colors.yale[700]] });

  const thumbColor = disabled ? OFF_TRACK_COLOR : theme.colors.white;

  const thumbTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - THUMB_SIZE - THUMB_INSET],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, style]}
    >
      {(label || description) && (
        <View style={styles.textContainer}>
          {label && (
            <Text variant="body1" color={disabled ? 'disabled' : 'primary'} weight="medium">
              {label}
            </Text>
          )}
          {description && (
            <Text variant="caption" color={disabled ? 'disabled' : 'secondary'} style={styles.description}>
              {description}
            </Text>
          )}
        </View>
      )}

      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackColor,
            borderWidth: disabled ? 1 : 0,
            borderColor: theme.colors.grey[50],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [{ translateX: thumbTranslateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
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
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    padding: THUMB_INSET / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default Switch;
