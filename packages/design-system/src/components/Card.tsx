/**
 * Card Component
 *
 * TICKET-006: Standardized card component
 * - Default padding: 16px
 * - Border radius: 16px
 * - Background: #FFFFFF
 * - Shadow: elevation 1 (default), elevation 2 (hover)
 * - Border: 1px solid #F3F4F6 (outlined variant)
 * - Press animation: scale 0.98, elevation 2
 * - Variants: default, outlined, elevated
 *
 * @example
 * ```tsx
 * // Basic card
 * <Card>
 *   <Card.Body>
 *     <Text>Card content</Text>
 *   </Card.Body>
 * </Card>
 *
 * // Full card with all sections
 * <Card onPress={() => navigation.navigate('Detail')}>
 *   <Card.Header>
 *     <Text>Note Title</Text>
 *   </Card.Header>
 *   <Card.Body>
 *     <Text>Note content...</Text>
 *   </Card.Body>
 *   <Card.Footer>
 *     <Text>Created: 2 days ago</Text>
 *   </Card.Footer>
 * </Card>
 * ```
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
} from 'react-native';
import { theme } from '../theme';

export interface CardProps {
  /**
   * Card content (use Card.Header, Card.Body, Card.Footer)
   */
  children: React.ReactNode;

  /**
   * Visual variant
   * - default: White background with border
   * - outlined: White background with border
   * - elevated: White background with shadow
   */
  variant?: 'default' | 'outlined' | 'elevated';

  /**
   * Callback when card is pressed (makes card pressable)
   */
  onPress?: () => void;

  /**
   * Whether the card is disabled
   */
  disabled?: boolean;

  /**
   * Custom container style
   */
  style?: ViewStyle;

  /**
   * Custom padding (overrides default 16px)
   */
  padding?: number;
}

/**
 * Card container component
 */
export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
} = ({ children, variant = 'default', onPress, disabled = false, style, padding }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = React.useState(false);

  // Handle press in animation
  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  // Handle press out animation
  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  // Variant styles - Design Spec compliant
  const variantStyles = {
    default: {
      backgroundColor: theme.colors.background.primary, // White
      borderWidth: 1,
      borderColor: theme.colors.neutral[100], // #F3F4F6
      ...theme.shadows.sm, // elevation 1
    },
    outlined: {
      backgroundColor: theme.colors.background.primary, // White
      borderWidth: 1,
      borderColor: theme.colors.neutral[100], // #F3F4F6
    },
    elevated: {
      backgroundColor: theme.colors.background.primary, // White
      borderWidth: 0,
      ...theme.shadows.md, // elevation 2
    },
  };

  // Pressed state gets higher elevation
  const pressedStyle = isPressed && onPress ? theme.shadows.md : {};

  const containerStyle = [
    styles.container,
    variantStyles[variant],
    pressedStyle,
    padding !== undefined && { padding },
    disabled && styles.disabled,
    style,
  ] as ViewStyle[];

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={containerStyle}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

/**
 * Card Header Component
 */
interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

/**
 * Card Body Component
 */
interface CardBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const CardBody: React.FC<CardBodyProps> = ({ children, style }) => {
  return <View style={[styles.body, style]}>{children}</View>;
};

/**
 * Card Footer Component
 */
interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Whether to show a divider above the footer
   */
  showDivider?: boolean;
}

const CardFooter: React.FC<CardFooterProps> = ({ children, style, showDivider = false }) => {
  return (
    <>
      {showDivider && <View style={styles.divider} />}
      <View style={[styles.footer, style]}>{children}</View>
    </>
  );
};

// Attach sub-components to Card
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl, // 16px - Design Spec
    overflow: 'hidden',
    padding: theme.spacing[4], // 16px - Design Spec
  },

  header: {
    marginBottom: theme.spacing[2], // 8px
  },

  body: {
    marginVertical: theme.spacing[1], // 4px
  },

  footer: {
    marginTop: theme.spacing[2], // 8px
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: theme.spacing[2],
  },

  disabled: {
    opacity: theme.opacity.disabled,
  },
});

export default Card;
