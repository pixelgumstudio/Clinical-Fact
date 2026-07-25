/**
 * FILE: /mnt/project/packages/design-system/src/components/Text.tsx
 * 
 * Text Component
 * 
 * A flexible text component with pre-defined typography styles.
 * Supports all heading levels, body text, captions, and custom styles.
 * 
 * @example
 * ```tsx
 * <Text variant="h1">Welcome to ClinicFact</Text>
 * <Text variant="body" color="secondary">Your study companion</Text>
 * <Text variant="caption" align="center">Terms and conditions apply</Text>
 * ```
 */

import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

export interface TextProps extends RNTextProps {
  /**
   * Typography variant
   */
  variant?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'body1'
    | 'body2'
    | 'caption'
    | 'overline'
    | 'button';

  /**
   * Text color from theme
   */
  color?: 'primary' | 'secondary' | 'tertiary' | 'disabled' | 'inverse' | 'error' | 'success';

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right' | 'justify';

  /**
   * Font weight override
   */
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

  /**
   * Make text bold
   */
  bold?: boolean;

  /**
   * Make text italic
   */
  italic?: boolean;

  /**
   * Underline text
   */
  underline?: boolean;

  /**
   * Number of lines before truncation
   */
  numberOfLines?: number;

  /**
   * Custom text style
   */
  style?: TextStyle;

  /**
   * Text content
   */
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body1',
  color = 'primary',
  align = 'left',
  weight,
  bold = false,
  italic = false,
  underline = false,
  numberOfLines,
  style,
  children,
  ...rest
}) => {
  // Get variant styles
  const variantStyle = theme.typography.styles[variant];

  // Get color style
  const colorStyle = {
    color: color === 'primary'
      ? theme.colors.text.primary
      : color === 'secondary'
      ? theme.colors.text.secondary
      : color === 'tertiary'
      ? theme.colors.text.tertiary
      : color === 'disabled'
      ? theme.colors.text.disabled
      : color === 'inverse'
      ? theme.colors.text.inverse
      : color === 'error'
      ? theme.colors.error.main
      : color === 'success'
      ? theme.colors.success.main
      : theme.colors.text.primary,
  };

  // Get alignment style
  const alignStyle = {
    textAlign: align,
  };

  // Get weight style
  const weightStyle = weight
    ? { fontWeight: theme.typography.fontWeight[weight] }
    : bold
    ? { fontWeight: theme.typography.fontWeight.bold }
    : {};

  // Get decoration styles
  const decorationStyle = {
    fontStyle: italic ? ('italic' as const) : ('normal' as const),
    textDecorationLine: underline ? ('underline' as const) : ('none' as const),
  };

  // Combine all styles
  const textStyle = [
    variantStyle,
    colorStyle,
    alignStyle,
    weightStyle,
    decorationStyle,
    style,
  ];

  return (
    <RNText style={textStyle} numberOfLines={numberOfLines} {...rest}>
      {children}
    </RNText>
  );
};

// Convenience components for common use cases
export const Heading1: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h6" {...props} />
);

export const Body: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="body1" {...props} />
);

export const Caption: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="caption" {...props} />
);

export default Text;