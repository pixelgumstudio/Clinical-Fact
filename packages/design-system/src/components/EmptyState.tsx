/**
 * EmptyState Component
 *
 * TICKET-004: EmptyState component with dotted path animation
 * - Illustration area: 200x200px
 * - Dotted path animation: 3-second loop, smooth bezier curve
 * - Title: 20px font, 600 weight, #1F2937 color
 * - Description: 14px font, 400 weight, #6B7280 color, centered
 * - Primary action button below description
 * - Secondary text link below button (optional)
 * - 32px spacing between elements
 * - Animation plays on mount, loops infinitely
 *
 * Variants:
 * 1. Empty library (book icon, dotted path)
 * 2. Empty chat (message icon, dotted path)
 * 3. Empty quiz (quiz icon, dotted path)
 * 4. Empty folder (folder icon, dotted path)
 * 5. No search results (search icon, dotted path)
 *
 * @example
 * ```tsx
 * // Basic empty state
 * <EmptyState
 *   variant="library"
 *   title="No notes yet"
 *   description="Create your first note to get started"
 *   buttonText="Create Note"
 *   onButtonPress={() => navigation.navigate('CreateNote')}
 * />
 *
 * // With secondary action
 * <EmptyState
 *   variant="search"
 *   title="No results found"
 *   description="Try adjusting your search terms"
 *   buttonText="Clear Search"
 *   onButtonPress={handleClearSearch}
 *   secondaryText="Browse all notes"
 *   onSecondaryPress={handleBrowse}
 * />
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated, Easing, TouchableOpacity } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';

export interface EmptyStateProps {
  /**
   * Variant determines the icon and animation
   * - library: Book icon with dotted path
   * - chat: Message icon with dotted path
   * - quiz: Quiz icon with dotted path
   * - folder: Folder icon with dotted path
   * - search: Search icon with dotted path
   */
  variant?: 'library' | 'chat' | 'quiz' | 'folder' | 'search';

  /**
   * Main title text (20px, 600 weight, #1F2937)
   */
  title: string;

  /**
   * Description text (14px, 400 weight, #6B7280)
   */
  description?: string;

  /**
   * Primary action button text
   */
  buttonText?: string;

  /**
   * Callback when action button is pressed
   */
  onButtonPress?: () => void;

  /**
   * Secondary text link below button
   */
  secondaryText?: string;

  /**
   * Callback when secondary text is pressed
   */
  onSecondaryPress?: () => void;

  /**
   * Custom illustration component (overrides variant icon)
   */
  illustration?: React.ReactNode;

  /**
   * Disable animation
   */
  disableAnimation?: boolean;

  /**
   * Custom container style
   */
  style?: ViewStyle;
}

/**
 * Simple icon placeholders (can be replaced with actual icons)
 */
const IconPlaceholder: React.FC<{ type: string }> = ({ type }) => {
  const iconMap: Record<string, string> = {
    library: '📚',
    chat: '💬',
    quiz: '📝',
    folder: '📁',
    search: '🔍',
  };

  return (
    <Text style={styles.iconPlaceholder}>
      {iconMap[type] || '📄'}
    </Text>
  );
};

/**
 * Dotted Path Animation Component
 */
const DottedPathAnimation: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 3000, // 3-second loop - Design Spec
          easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Smooth bezier curve
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [disabled, animValue]);

  // Animated path properties
  const translateY = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -20, 0],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.95, 1.05, 0.95],
  });

  return (
    <View style={styles.pathContainer}>
      {/* Dotted path circles */}
      <Animated.View
        style={[
          styles.dot,
          {
            transform: [{ translateY }, { scale }],
            opacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            transform: [{ translateY: Animated.multiply(translateY, -0.5) }, { scale }],
            opacity: Animated.multiply(opacity, 0.7),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            transform: [{ translateY: Animated.multiply(translateY, -1) }, { scale }],
            opacity: Animated.multiply(opacity, 0.4),
          },
        ]}
      />
    </View>
  );
};

/**
 * EmptyState component for no data scenarios
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'library',
  title,
  description,
  buttonText,
  onButtonPress,
  secondaryText,
  onSecondaryPress,
  illustration,
  disableAnimation = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Illustration Area - Design Spec: 200x200px */}
      <View style={styles.illustrationContainer}>
        {illustration || (
          <>
            <IconPlaceholder type={variant} />
            <DottedPathAnimation disabled={disableAnimation} />
          </>
        )}
      </View>

      {/* Title - Design Spec: 20px, 600 weight, #1F2937 */}
      <Text style={styles.title}>{title}</Text>

      {/* Description - Design Spec: 14px, 400 weight, #6B7280, centered */}
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {/* Primary Action Button - Design Spec: 32px spacing */}
      {buttonText && onButtonPress && (
        <Button
          variant="primary"
          size="large"
          onPress={onButtonPress}
          style={styles.button}
        >
          {buttonText}
        </Button>
      )}

      {/* Secondary Text Link */}
      {secondaryText && onSecondaryPress && (
        <TouchableOpacity onPress={onSecondaryPress} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>{secondaryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[6], // 24px
  },

  // Illustration Area - Design Spec: 200x200px
  illustrationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[8], // 32px - Design Spec
    position: 'relative',
  },

  iconPlaceholder: {
    fontSize: 80,
    textAlign: 'center',
  },

  // Dotted path animation
  pathContainer: {
    position: 'absolute',
    bottom: -30,
    flexDirection: 'row',
    gap: theme.spacing[2],
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.neutral[400],
  },

  // Title - Design Spec: 20px font, 600 weight, #1F2937 color
  title: {
    fontSize: theme.typography.fontSize.xl, // 20px
    fontWeight: theme.typography.fontWeight.semibold, // 600
    color: theme.colors.neutral[800], // #1F2937
    textAlign: 'center',
    marginBottom: theme.spacing[2], // 8px
    maxWidth: 320,
  },

  // Description - Design Spec: 14px font, 400 weight, #6B7280 color
  description: {
    fontSize: theme.typography.fontSize.sm, // 14px
    fontWeight: theme.typography.fontWeight.normal, // 400
    color: theme.colors.neutral[500], // #6B7280
    textAlign: 'center',
    lineHeight: 21, // 14 * 1.5
    marginBottom: theme.spacing[8], // 32px - Design Spec
    maxWidth: 320,
  },

  // Button - Design Spec: 32px spacing from description
  button: {
    minWidth: 200,
    marginBottom: theme.spacing[4], // 16px
  },

  // Secondary text link
  secondaryText: {
    fontSize: theme.typography.fontSize.sm, // 14px
    fontWeight: theme.typography.fontWeight.medium, // 500
    color: theme.colors.neutral[500], // #6B7280
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default EmptyState;
