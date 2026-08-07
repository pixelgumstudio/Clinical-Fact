// packages/design-system/src/theme/colors.ts
//
// Source of truth: confirmed 2026-07-28 against 4+ real Figma screen/component
// exports (button states, input states, quiz screens, onboarding screen).
// See conversation history — the grey/yale/linen/green/red/orange palette below
// is the one actually used throughout the live designs, not the newer
// Grey/Blue/Red/Green/Yellow/Teal sheet that was briefly considered.

export const white = '#FFFFFF';

export const grey = {
  10: '#F9F9F9',
  50: '#EBEBEB',
  100: '#D7D7D7',
  200: '#BFBFBF',
  300: '#A6A6A6',
  400: '#8B8B8B',
  500: '#757575',
  600: '#636363',
  700: '#484848',
  800: '#2D2D2D',
  900: '#1C1C1C',
} as const;

// Brand blue — used for primary buttons, focus rings, links, active states
export const yale = {
  10: '#F6FCFF',
  50: '#ECF9FE',
  100: '#C5ECFC',
  200: '#8ADAF9',
  300: '#50C7F7',
  400: '#15B5F4',
  500: '#098EC3',
  600: '#07729C',
  700: '#054D69',
  800: '#04394E',
  900: '#021627',
} as const;

// Warm neutral — screen backgrounds, secondary surfaces
export const linen = {
  10: '#FDFCFA',
  50: '#FBFAF7',
  100: '#F9F7F2',
  200: '#F7F4EE',
  300: '#F5F2EA',
  400: '#F3EFE6',
  500: '#CAC7C0',
  600: '#A29F99',
  700: '#7A7873',
  800: '#51504D',
  900: '#31302E',
} as const;

export const green = {
  10: '#F9FFFB',
  50: '#EDF6F0',
  100: '#D8E4DC',
  200: '#BED3C4',
  300: '#9EBCA6',
  400: '#7EA689',
  500: '#5D906C',
  600: '#3D7A4E',
  700: '#336641',
  800: '#295134',
  900: '#1F3D27',
} as const;

export const red = {
  10: '#FFFCFC',
  50: '#FFF4F3',
  100: '#EFDAD8',
  200: '#E5C1BD',
  300: '#D7A29C',
  400: '#CA837C',
  500: '#BD645B',
  600: '#B0453A',
  700: '#933A30',
  800: '#752E27',
  900: '#58231D',
} as const;

export const orange = {
  10: '#FFFEFC',
  50: '#FFF8F0',
  100: '#F4E6D5',
  200: '#EDD5BA',
  300: '#E4C097',
  400: '#DBAB74',
  500: '#D29652',
  600: '#C9812F',
  700: '#A76C27',
  800: '#86561F',
  900: '#654118',
} as const;

// ── Semantic layer ──────────────────────────────────────────────────────────
// Kept in the same shape existing components already consume (primary[500],
// success.main, text.primary, etc.) so this redesign doesn't require touching
// every component at once — components get correct real colors immediately,
// and get migrated to reference the raw scales above over time.

export const colors = {
  primary: yale,
  secondary: linen,
  neutral: { 0: white, ...grey, 950: grey[900] },

  success: { light: green[100], main: green[600], dark: green[800], ...green },
  error: { light: red[100], main: red[600], dark: red[800], ...red },
  warning: { light: orange[100], main: orange[600], dark: orange[800], ...orange },
  info: { light: yale[100], main: yale[600], dark: yale[800], ...yale },

  background: {
    default: white,
    primary: white,
    secondary: grey[10],
    tertiary: grey[50],
    paper: grey[10],
    elevated: white,
    dark: grey[900],
  },

  text: {
    primary: grey[900],
    secondary: grey[600],
    tertiary: grey[500],
    disabled: grey[300],
    inverse: white,
  },

  border: {
    light: grey[50],
    main: grey[100],
    dark: grey[200],
    focus: yale[900],
  },

  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.7)',
  },

  // Raw palette scales, for components built directly against the confirmed tokens
  white,
  grey,
  yale,
  linen,
  green,
  red,
  orange,
} as const;

export type ColorPalette = typeof colors;
export type ColorShade = keyof typeof grey;
