/**
 * Icon Component
 *
 * Renders from the confirmed icon set (packages/design-system/src/icons/registry.ts
 * — 75 vector icons generated from the real Figma export on 2026-07-28, see
 * scripts/generate-icon-registry.js). Previously this component was an unused
 * placeholder expecting a third-party icon library to be wired in via
 * `IconComponent` — nothing in the app used it, so it's replaced outright.
 *
 * Most icons were exported as a single flat color and can be recolored via
 * the `color` prop; a few multi-color ones (flags, the Google mark) always
 * render as designed regardless of `color`. The Google "G" mark is a raster
 * image in the source file (Google's mark isn't meant to be recolored
 * anyway), so it's handled as an Image, not SVG.
 *
 * @example
 * ```tsx
 * <Icon name="chat" size="md" color={theme.colors.grey[600]} />
 * <Icon name="starFill" size={20} color={theme.colors.orange[600]} />
 * <Icon name="google" size={24} />
 * ```
 */

import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { theme } from '../theme';
import { iconRegistry, IconName } from '../icons/registry';

export interface IconProps {
  name: IconName | 'google';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Only applies to single-tone icons (see registry `recolorHex`) */
  color?: string;
  style?: ViewStyle;
}

const SIZE_MAP: Record<string, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
};

export const Icon: React.FC<IconProps> = ({ name, size = 'md', color, style }) => {
  const iconSize = typeof size === 'number' ? size : SIZE_MAP[size];

  if (name === 'google') {
    return (
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      <Image
        source={require('../icons/assets/google-logo.png')}
        style={[{ width: iconSize, height: iconSize }, style as ImageStyle]}
        resizeMode="contain"
      />
    );
  }

  const entry = iconRegistry[name];
  if (!entry) {
    if (__DEV__) {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return <View style={[{ width: iconSize, height: iconSize }, style]} />;
  }

  let xml = entry.xml;
  if (color && entry.recolorHex) {
    xml = xml.split(entry.recolorHex).join(color);
  }
  // fill="none" on the root: SVG's default fill is black, and several
  // stroke-only icons in the registry (e.g. "unsucessful") never set their
  // own fill, so without this they render as a solid black-filled shape
  // instead of a transparent outline. Elements with their own explicit
  // fill="#hex" (the filled icons) are unaffected — their own attribute
  // always wins over this inherited default.
  const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${entry.viewBox}" fill="none">${xml}</svg>`;

  return (
    <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
      <SvgXml xml={svgSource} width={iconSize} height={iconSize} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Kept for convenience elsewhere in the design system (Button/Avatar defaults, etc.)
export const iconColors = {
  default: theme.colors.grey[600],
  active: theme.colors.yale[700],
  disabled: theme.colors.grey[300],
  inverse: theme.colors.white,
};

export default Icon;
