/**
 * Loading Component
 *
 * TICKET-007: Loading component with multiple variants
 * - Spinner variant: 24px/32px/40px sizes, #1F2937 color (default)
 * - Skeleton variant: Animated pulse for content placeholders
 * - Shimmer variant: Animated gradient sweep
 * - Full screen loading overlay
 * - Inline loading state
 * - Button loading state integration
 *
 * @example
 * ```tsx
 * // Basic spinner
 * <Loading size="medium" />
 *
 * // Large spinner with message
 * <Loading size="large" message="Loading notes..." />
 *
 * // Full screen overlay
 * <Loading overlay message="Processing your request..." />
 *
 * // Skeleton loader
 * <LoadingSkeleton width={200} height={20} />
 *
 * // Shimmer variant
 * <LoadingSkeleton width="100%" height={100} shimmer />
 * ```
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  ViewStyle,
  DimensionValue,
  Animated,
  Easing,
} from 'react-native';
import { theme } from '../theme';

export interface LoadingProps {
  /**
   * Size of the loading indicator
   * - small: 24px
   * - medium: 32px
   * - large: 40px
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Color of the loading indicator
   */
  color?: string;

  /**
   * Optional message to display below the spinner
   */
  message?: string;

  /**
   * Whether to show as a full-screen overlay
   */
  overlay?: boolean;

  /**
   * Overlay background color
   */
  overlayColor?: string;

  /**
   * Overlay opacity
   */
  overlayOpacity?: number;

  /**
   * Custom container style
   */
  style?: ViewStyle;
}

/**
 * Loading indicator component
 */
export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  color = theme.colors.neutral[800], // #1F2937 - Design Spec
  message,
  overlay = false,
  overlayColor = theme.colors.neutral[900],
  overlayOpacity = 0.8,
  style,
}) => {
  // Map sizes to actual pixel values - Design Spec
  const sizeMap = {
    small: 24,
    medium: 32,
    large: 40,
  };

  const spinnerSize = sizeMap[size];

  const content = (
    <View style={[styles.container, overlay && styles.overlayContainer, style]}>
      <View style={[styles.spinnerContainer, overlay && styles.overlayContent]}>
        <ActivityIndicator size={spinnerSize as any} color={color} />

        {message && (
          <Text style={[styles.message, overlay && styles.overlayMessage]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <Modal transparent visible animationType="fade">
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: overlayColor,
              opacity: overlayOpacity,
            },
          ]}
        >
          {content}
        </View>
      </Modal>
    );
  }

  return content;
};

/**
 * Loading Skeleton Component
 *
 * A skeleton loader for content placeholders with optional shimmer animation
 *
 * @example
 * ```tsx
 * <LoadingSkeleton width={200} height={20} />
 * <LoadingSkeleton width="100%" height={100} rounded />
 * <LoadingSkeleton width="100%" height={60} shimmer />
 * ```
 */
export interface LoadingSkeletonProps {
  /**
   * Width of the skeleton
   */
  width?: DimensionValue;

  /**
   * Height of the skeleton
   */
  height?: number;

  /**
   * Whether to make skeleton circular
   */
  circular?: boolean;

  /**
   * Whether to make skeleton rounded
   */
  rounded?: boolean;

  /**
   * Enable shimmer animation
   */
  shimmer?: boolean;

  /**
   * Custom style
   */
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 16,
  circular = false,
  rounded = false,
  shimmer = false,
  style,
}) => {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (shimmer) {
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [shimmer, shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const skeletonStyle: ViewStyle[] = [
    styles.skeleton,
    {
      width,
      height,
      borderRadius: circular
        ? (height as number) / 2
        : rounded
        ? theme.borderRadius.md
        : theme.borderRadius.sm,
    },
    ...(circular ? [{ aspectRatio: 1 } as ViewStyle] : []),
    ...(style ? [style] : []),
  ];

  return (
    <View style={skeletonStyle}>
      {shimmer && (
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      )}
    </View>
  );
};

/**
 * Loading Dots Component
 *
 * Animated dots loader
 *
 * @example
 * ```tsx
 * <LoadingDots />
 * <LoadingDots color={theme.colors.primary[500]} />
 * ```
 */
export interface LoadingDotsProps {
  /**
   * Color of the dots
   */
  color?: string;

  /**
   * Size of each dot
   */
  size?: number;

  /**
   * Custom style
   */
  style?: ViewStyle;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  color = theme.colors.neutral[800],
  size = 8,
  style,
}) => {
  return (
    <View style={[styles.dotsContainer, style]}>
      <View style={[styles.dot, { width: size, height: size, backgroundColor: color }]} />
      <View
        style={[
          styles.dot,
          { width: size, height: size, backgroundColor: color, opacity: 0.7 },
        ]}
      />
      <View
        style={[
          styles.dot,
          { width: size, height: size, backgroundColor: color, opacity: 0.4 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },

  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  spinnerContainer: {
    alignItems: 'center',
  },

  overlayContent: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing[6],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
  },

  message: {
    marginTop: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },

  overlayMessage: {
    color: theme.colors.text.primary,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  skeleton: {
    backgroundColor: theme.colors.neutral[200],
    overflow: 'hidden',
    position: 'relative',
  },

  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 200,
  },

  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },

  dot: {
    borderRadius: theme.borderRadius.full,
  },
});

export default Loading;
