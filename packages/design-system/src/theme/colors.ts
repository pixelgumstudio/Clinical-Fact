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
  701: '#075878',
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

// ── Vivid accents ────────────────────────────────────────────────────────────
// Literal values preserved as-is from screens that were built against a
// Tailwind-style palette instead of the scales above (success/error/warning
// checkmarks, badges, accent icons across chat/flashcards/quizzes/feedback).
// Kept as a separate set — not merged into success/error/warning above —
// because those are deliberately muted and swapping call sites onto them
// would change the live appearance of those screens. Centralizing the
// literals here first; whether vivid and muted should converge is a design
// decision for later, not something this token addition should force.
export const slate = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
} as const;

export const vivid = {
  success: { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#D1FAE5', 500: '#10B981', 600: '#059669' },
  error: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 800: '#991B1B', 900: '#7F1D1D' },
  warning: { 100: '#FEF3C7', 500: '#F59E0B', 800: '#92400E' },
  accent: { 50: '#FFF7ED', 100: '#FFEDD5', 500: '#F97316' },
  info: { 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 500: '#3B82F6', 800: '#1E40AF' },
} as const;

// ── Decorative tag palettes ──────────────────────────────────────────────────
// Fixed sets of pastel colors used for visual variety (not semantic meaning)
// across flashcard tags, folder tags, and progress/loading gradients. These
// were previously duplicated as raw literals across several files — in one
// case (SetupScreen's GRADIENT_COLORS) with a one-character copy-paste drift
// in the second stop ('#DCEE89' vs the '#DCEEB9' used everywhere else).
// Centralizing them here as named stops fixes that drift and lets each call
// site pick exactly the stops it needs by name instead of by fragile array
// position/order.
export const pastelRainbow = {
  mint: '#CEF9D0',
  lime: '#DCEEB9',
  coral: '#FFB09C',
  honeydew: '#ECE19F',
  wheat: '#F3DA93',
  apricot: '#F9C597',
} as const;

// Rotating per-card color (apps/mobile/src/store/flashcardStore.ts)
export const flashcardTagPalette = ['#FFD1B8', '#B8E0D8', '#FFE0A8', '#C8E0B8'] as const;

// User-assignable folder color (apps/mobile/src/components/FoldersModal.tsx).
// Kept to exactly these 6 keys — AddFolderModal renders one swatch per
// Object.entries(FOLDER_COLORS) key, so adding a 7th key here would silently
// add a 7th swatch to that picker.
export const folderTagPalette = {
  orange: '#FFD4A3',
  blue: vivid.info[300],
  red: '#FCA5A5',
  purple: '#C4B5FD',
  green: '#D9F99D',
  peach: '#FED7AA',
} as const;

// Lighter tint of folderTagPalette.orange, used for the "no folder" tile
// background in FoldersModal.tsx — not part of the swatch picker above.
export const folderAccentLight = '#FFE5CC';

// ── Component-specific one-offs ─────────────────────────────────────────────
// Each of these is used at exactly one call site (or a couple of the same
// semantic kind) for a bespoke accent that doesn't belong to any palette
// above — a locked/premium banner, a single badge, a single decorative
// border. They're centralized here, per this file's own role as the single
// color source of truth, so no screen hardcodes hex directly — but unlike
// the palettes above, there's no expectation these get reused elsewhere.
export const oneOff = {
  mutedPlaceholder: '#999999', // ReferralCodeScreen, FlashcardHistoryScreen, QuizHistoryScreen — muted icon/placeholder
  disabledBorder: '#DDDDDD', // ReferralCodeScreen — disabled input border
  flatError: '#E74C3C', // ReferralCodeScreen — referral-code validation error text
  flatSuccess: '#27AE60', // ReferralCodeScreen — referral-code validation success text
  sharedBadgeBg: '#EEF2FF', // SharedNoteScreen
  sharedBadgeText: '#6366F1', // SharedNoteScreen
  lockedBannerBg: '#1A1A1A', // ChatComposer — premium-locked composer banner
  lockedBannerGold: '#FFD700', // ChatComposer — same banner, border + text
  musicBannerBorder: '#FDE68A', // NoteTranscriptScreen
  quizAccentGradientStop: '#FCD0D0', // NoteDetailScreen — 2nd stop of a 2-stop gradient
  starGold: '#FCB500', // ThanksScreen — rating stars
  setupCheckmark: '#000000', // SetupScreen
  setupBorder: '#E0E0E0', // SetupScreen
  libraryIconBg: '#EFEFEF', // LibraryScreen
  libraryFolderSelectedBg: '#FAFAFA', // LibraryScreen
  libraryEmptyIconBg: '#F3F3F4', // LibraryScreen
  lightGrayChip: '#F0F0F0', // OnboardingTooltip close button, OnboardingScreen label pill
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

  // Secondary scales — see comment above `slate`/`vivid` definitions
  slate,
  vivid,

  // Decorative tag palettes — see comment above their definitions
  pastelRainbow,
  flashcardTagPalette,
  folderTagPalette,
  folderAccentLight,

  // Component-specific one-offs — see comment above their definitions
  oneOff,
} as const;

export type ColorPalette = typeof colors;
export type ColorShade = keyof typeof grey;
