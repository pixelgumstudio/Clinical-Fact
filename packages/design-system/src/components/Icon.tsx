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
import { AppleIcon } from '../icons/SocialIcons';

// Raw markup for the icons added alongside the confirmed registry (not yet run through
// scripts/generate-icon-registry.js) — rendered the same way as registry icons, via SvgXml,
// rather than as an Image asset: React Native's Image component decodes raster formats
// (PNG/JPEG/etc.) and can't rasterize arbitrary SVG XML, so `require()`-ing one straight
// into an Image source renders blank on-device.
const FORWARD_ICON_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
<path d="M13.9994 11.9082L18.6016 15.999L13.9994 20.0898" stroke="#BFBFBF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const MAKE_FLASHCARDS_ICON_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
<rect width="32" height="32" rx="8" fill="white"/>
<rect x="7" y="7" width="18" height="18" rx="3" stroke="#DBAB74" stroke-width="2"/>
<path d="M11 13.5L21 13.5" stroke="#DBAB74" stroke-width="2" stroke-linecap="round"/>
<path d="M13 18.5L19 18.5" stroke="#DBAB74" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const PRACTICE_QUIZ_ICON_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
<rect width="32" height="32" rx="8" fill="white"/>
<path d="M11.0664 6L11.0664 5H11.0664V6ZM16.1328 11.0664H17.1328V11.0664L16.1328 11.0664ZM11.0664 16.1328V17.1328H11.0664L11.0664 16.1328ZM6 11.0664L5 11.0664V11.0664H6ZM11.0664 6L11.0664 7C13.3122 7.00007 15.1328 8.82065 15.1328 11.0664L16.1328 11.0664L17.1328 11.0664C17.1328 7.71605 14.4167 5.0001 11.0664 5L11.0664 6ZM16.1328 11.0664H15.1328C15.1328 13.3122 13.3122 15.1327 11.0664 15.1328L11.0664 16.1328L11.0664 17.1328C14.4167 17.1327 17.1328 14.4168 17.1328 11.0664H16.1328ZM11.0664 16.1328V15.1328C8.82055 15.1328 7 13.3123 7 11.0664H6H5C5 14.4168 7.71598 17.1328 11.0664 17.1328V16.1328ZM6 11.0664L7 11.0664C7.00003 8.82057 8.82059 7 11.0664 7V6V5C7.71599 5 5.00005 7.71603 5 11.0664L6 11.0664Z" fill="#3D7A4E"/>
<path d="M9.46484 11.1847L10.6073 12.1325C11.2139 11.1468 11.6591 10.676 12.6637 10" stroke="#3D7A4E" stroke-width="1.57842" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.0664 15V14H21.0664L21.0664 15ZM26.1328 20.0664H27.1328V20.0664L26.1328 20.0664ZM21.0664 25.1328L21.0664 26.1328H21.0664V25.1328ZM16 20.0664L15 20.0664V20.0664H16ZM21.0664 15V16C23.3122 16 25.1328 17.8206 25.1328 20.0664L26.1328 20.0664L27.1328 20.0664C27.1328 16.716 24.4168 14 21.0664 14V15ZM26.1328 20.0664H25.1328C25.1328 22.3123 23.3123 24.1328 21.0664 24.1328V25.1328V26.1328C24.4168 26.1328 27.1328 23.4168 27.1328 20.0664H26.1328ZM21.0664 25.1328L21.0664 24.1328C18.8206 24.1328 17 22.3122 17 20.0664H16H15C15 23.4168 17.716 26.1328 21.0664 26.1328L21.0664 25.1328ZM16 20.0664L17 20.0664C17 17.8206 18.8206 16 21.0664 16L21.0664 15L21.0664 14C17.716 14 15 16.716 15 20.0664L16 20.0664Z" fill="#3D7A4E"/>
<path d="M22.2734 18.83L19.7986 21.305" stroke="#3D7A4E" stroke-width="2" stroke-linecap="round"/>
<path d="M22.2735 21.3046L19.7986 18.8298" stroke="#3D7A4E" stroke-width="2" stroke-linecap="round"/>
<circle cx="23" cy="8" r="2" fill="#3D7A4E"/>
<circle cx="9" cy="23" r="2" fill="#3D7A4E"/>
</svg>`;

export interface IconProps {
  name: IconName | 'google' | 'apple';
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

  if (name === 'apple') {
    return (
      <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
        <AppleIcon size={iconSize} color={color} />
      </View>
    );
  }

  if (name === 'forward') {
    return (
      <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
        <SvgXml xml={FORWARD_ICON_XML} width={iconSize} height={iconSize} />
      </View>
    );
  }

  if (name === 'makeFlashcard') {
    return (
      <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
        <SvgXml xml={MAKE_FLASHCARDS_ICON_XML} width={iconSize} height={iconSize} />
      </View>
    );
  }

  if (name === 'practiceQuiz') {
    return (
      <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
        <SvgXml xml={PRACTICE_QUIZ_ICON_XML} width={iconSize} height={iconSize} />
      </View>
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
