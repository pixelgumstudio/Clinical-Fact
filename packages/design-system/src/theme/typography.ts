// packages/design-system/src/theme/typography.ts
//
// Confirmed 2026-07-28 from the Figma design-tokens export: Lora for display
// headings (h1-h5), Inter for everything else. React Native maps each weight
// to its own loaded font-family name (see App.tsx useFonts call) rather than
// combining a single family with a fontWeight prop, so every text style below
// pairs an exact fontFamily with the matching fontWeight for clarity.

export const fontFamily = {
  lora: 'Lora_500Medium',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  // Back-compat alias for older components still referencing a single "primary" family
  primary: 'Inter_400Regular',
  mono: 'Courier New',
} as const;

export const fontSize = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 60,
  '6xl': 90,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  // Back-compat aliases (only regular/medium/semibold are used by the
  // confirmed Lora/Inter type ramp — these exist so components written
  // against the previous, larger weight scale keep compiling)
  thin: '100' as const,
  extralight: '200' as const,
  light: '300' as const,
  normal: '400' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

export const letterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
};

// The confirmed type ramp. fontSize/lineHeight/letterSpacing are absolute px,
// matching the Figma export exactly (RN requires absolute lineHeight, not a multiplier).
export const textStyles = {
  h1: { fontFamily: fontFamily.lora, fontWeight: fontWeight.medium, fontSize: 90, lineHeight: 104, letterSpacing: -3.6 },
  h2: { fontFamily: fontFamily.lora, fontWeight: fontWeight.medium, fontSize: 60, lineHeight: 70, letterSpacing: -2.4 },
  h3: { fontFamily: fontFamily.lora, fontWeight: fontWeight.medium, fontSize: 48, lineHeight: 58, letterSpacing: -1.92 },
  h4: { fontFamily: fontFamily.lora, fontWeight: fontWeight.medium, fontSize: 32, lineHeight: 39, letterSpacing: -1 },
  h5: { fontFamily: fontFamily.lora, fontWeight: fontWeight.medium, fontSize: 24, lineHeight: 32, letterSpacing: -0.48 },
  h6: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 24, lineHeight: 36, letterSpacing: -0.48 },
  h7: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 20, lineHeight: 28, letterSpacing: -0.4 },

  title1: { fontFamily: fontFamily.interSemiBold, fontWeight: fontWeight.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.16 },
  title2: { fontFamily: fontFamily.interSemiBold, fontWeight: fontWeight.semibold, fontSize: 14, lineHeight: 20, letterSpacing: -0.14 },
  title3: { fontFamily: fontFamily.interSemiBold, fontWeight: fontWeight.semibold, fontSize: 12, lineHeight: 16, letterSpacing: -0.12 },

  subtitle1: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 16, lineHeight: 22, letterSpacing: -0.16 },
  subtitle2: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 14, lineHeight: 20, letterSpacing: -0.28 },

  p1: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 16, lineHeight: 24, letterSpacing: -0.64 },
  p2: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 14, lineHeight: 20, letterSpacing: -0.28 },
  p3: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 12, lineHeight: 16, letterSpacing: -0.24 },

  label1: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 12, lineHeight: 16, letterSpacing: -0.12 },
  label2: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 10, lineHeight: 12, letterSpacing: -0.1 },

  caption1: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 12, lineHeight: 16, letterSpacing: -0.12 },
  caption2: { fontFamily: fontFamily.interRegular, fontWeight: fontWeight.regular, fontSize: 10, lineHeight: 12, letterSpacing: -0.1 },

  nav1: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 16, lineHeight: 24, letterSpacing: -0.16 },
  nav2: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 14, lineHeight: 20, letterSpacing: -0.14 },
  nav3: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 12, lineHeight: 16, letterSpacing: -0.12 },

  button1: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 16, lineHeight: 22, letterSpacing: -0.16 },
  button2: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 14, lineHeight: 20, letterSpacing: -0.14 },
  button3: { fontFamily: fontFamily.interMedium, fontWeight: fontWeight.medium, fontSize: 12, lineHeight: 16, letterSpacing: -0.12 },
} as const;

// Back-compat aliases so components not yet migrated to the named ramp above keep working
export const styles = {
  h1: textStyles.h4, // old h1 slot (32px) now maps to the confirmed h4 size
  h2: textStyles.h5,
  h3: { ...textStyles.h6 },
  h4: textStyles.h7,
  h5: textStyles.title1,
  h6: textStyles.subtitle1,
  body1: textStyles.p1,
  body2: textStyles.p2,
  caption: textStyles.caption1,
  overline: { ...textStyles.label2, letterSpacing: 1, textTransform: 'uppercase' as const },
  button: textStyles.button1,
} as const;

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  styles,
} as const;

export type Typography = typeof typography;
export type TextStyleName = keyof typeof textStyles;
