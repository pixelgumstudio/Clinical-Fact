/**
 * FILE: packages/design-system/src/theme/index.ts
 *
 * Clinical Fact Design System Theme
 *
 * Composes the modular theme files (colors, typography, spacing) into a
 * single theme object. Previously this file duplicated its own separate
 * colors/typography/spacing definitions instead of importing the sibling
 * files — that duplication was the source of two conflicting, unconfirmed
 * palettes. As of 2026-07-28 this file is the single composition point;
 * colors.ts/typography.ts/spacing.ts are the source of truth.
 */

import { colors } from './colors';
import { typography } from './typography';
import {
  spacing,
  borderRadius,
  borderWidth,
  shadows,
  iconSizes,
  heights,
} from './spacing';

export * from './colors';
export * from './typography';
export * from './spacing';

export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  medium: 0.6,
  light: 0.3,
};

export const layout = {
  screenPadding: {
    horizontal: 16,
    vertical: 20,
  },
  dimensions: {
    inputHeight: heights.input.large,
    buttonHeight: heights.button.large,
    tabBarHeight: 60,
    headerHeight: 56,
    iconSize: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,
    },
  },
  breakpoints: {
    sm: 375,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
  },
};

// Complete theme object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  borderWidth,
  shadows,
  iconSizes,
  heights,
  opacity,
  layout,
  animation,
};

export type Theme = typeof theme;
export type ThemeColors = typeof colors;
export type ThemeTypography = typeof typography;
export type ThemeSpacing = typeof spacing;

export default theme;
