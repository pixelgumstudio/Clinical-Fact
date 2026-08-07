import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@clinicalfact/design-system';

interface ToastProps {
  visible: boolean;
  message: string;
  onHide: () => void;
  /** How long the toast stays fully visible before fading out, in ms. */
  duration?: number;
}

/** Small self-dismissing pill notification — replaces blocking Alert-style confirmations
 *  (e.g. "Copied") that force the user to tap a button just to acknowledge them. */
export const Toast: React.FC<ToastProps> = ({ visible, message, onHide, duration = 2000 }) => {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (hideTimer.current) clearTimeout(hideTimer.current);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: 200, useNativeDriver: true }),
      ]).start(() => onHide());
    }, duration);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: insets.bottom + spacing[6], opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '80%',
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderRadius: 100,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    zIndex: 100,
    elevation: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
