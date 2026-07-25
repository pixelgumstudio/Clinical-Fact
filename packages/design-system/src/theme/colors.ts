// packages/design-system/src/theme/colors.ts

export const colors = {
  // Neutral/Grey Scale
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    950: '#0A0A0A',
  },

  // Teal (Primary Brand Color)
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
    950: '#042F2E',
  },

  // Yellow (Secondary/Accent Color)
  yellow: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308',
    600: '#CA8A04',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
    950: '#422006',
  },

  // Green (Success/Positive States)
  green: {
    50: '#F7FEE7',
    100: '#ECFCCB',
    200: '#D9F99D',
    300: '#BEF264',
    400: '#A3E635',
    500: '#84CC16',
    600: '#65A30D',
    700: '#4D7C0F',
    800: '#3F6212',
    900: '#365314',
    950: '#1A2E05',
  },

  // Red (Error/Alert States)
  red: {
    50: '#FEF2F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
    950: '#4C0519',
  },

  // Blue (Info/Links)
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Semantic Colors
  primary: '#14B8A6', // Teal 500
  secondary: '#EAB308', // Yellow 500
  success: '#84CC16', // Green 500
  warning: '#EAB308', // Yellow 500
  error: '#F43F5E', // Red 500
  info: '#3B82F6', // Blue 500

  // Background Colors
  background: {
    default: '#FFFFFF',
    paper: '#FAFAFA',
    elevated: '#FFFFFF',
  },

  // Surface Colors
  surface: {
    default: '#FFFFFF',
    hover: '#F5F5F5',
    pressed: '#EEEEEE',
    disabled: '#E0E0E0',
  },

  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    default: '#E0E0E0',
    focus: '#14B8A6',
    error: '#F43F5E',
  },

  // Note Type Colors
  noteType: {
    audio: '#14B8A6', // Teal
    text: '#3B82F6', // Blue
    pdf: '#F43F5E', // Red
    youtube: '#F43F5E', // Red
    image: '#EAB308', // Yellow
  },

  // Gradients
  gradients: {
    gradient1: 'linear-gradient(135deg, #FFE4E6 0%, #FEF9C3 100%)',
    gradient2: 'linear-gradient(135deg, #CCFBF1 0%, #DBEAFE 100%)',
    gradient3: 'linear-gradient(135deg, #FEF9C3 0%, #ECFCCB 100%)',
    gradient4: 'linear-gradient(135deg, #DBEAFE 0%, #FFE4E6 100%)',
  },
} as const;

export type ColorPalette = typeof colors;
export type ColorShade = keyof typeof colors.neutral;