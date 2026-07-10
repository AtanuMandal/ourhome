/**
 * The six society themes HQAdmin can assign, kept in sync with the Angular frontend's
 * :root[data-theme='...'] blocks in styles.scss and the backend's Society.ValidThemeIds.
 * Each entry has the exact shape of the legacy static `colors.ts` export so every existing
 * consumer keeps working unchanged.
 */
export type ThemeId = 'ocean' | 'emerald' | 'sunset' | 'violet' | 'slate' | 'teal';

export interface ColorTokens {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: string;
  activeTabBg: string;
  /** Text/icon color rendered on top of a `primary`-filled surface (button labels etc.). */
  onPrimary: string;
  /** Text/icon color rendered on top of an `accent`-filled surface. */
  onAccent: string;
}

export const DEFAULT_THEME_ID: ThemeId = 'ocean';

export const THEME_LABELS: Record<ThemeId, string> = {
  ocean: 'Ocean Blue',
  emerald: 'Emerald Green',
  sunset: 'Sunset Amber',
  violet: 'Royal Violet',
  slate: 'Slate Dark',
  teal: 'Teal Lagoon',
};

export const themes: Record<ThemeId, ColorTokens> = {
  ocean: {
    primary: '#1565C0',
    primaryLight: '#1976D2',
    primaryDark: '#0D47A1',
    accent: '#00695C',
    accentLight: '#4DB6AC',
    success: '#2E7D32',
    warning: '#B45309',
    error: '#C62828',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: { primary: '#1A1F27', secondary: '#5B6472', disabled: '#9AA3AF' },
    border: '#7E8CA0',
    activeTabBg: 'rgba(21, 101, 192, 0.10)',
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
  emerald: {
    primary: '#15803D',
    primaryLight: '#16A34A',
    primaryDark: '#14532D',
    accent: '#0F766E',
    accentLight: '#5EEAD4',
    success: '#2E7D32',
    warning: '#B45309',
    error: '#C62828',
    background: '#F4FAF6',
    surface: '#FFFFFF',
    text: { primary: '#14251C', secondary: '#4B6358', disabled: '#8CA79A' },
    border: '#7C9C89',
    activeTabBg: 'rgba(21, 128, 61, 0.10)',
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
  sunset: {
    primary: '#C2410C',
    primaryLight: '#EA580C',
    primaryDark: '#9A3412',
    accent: '#6D28D9',
    accentLight: '#A78BFA',
    success: '#2E7D32',
    warning: '#B45309',
    error: '#C62828',
    background: '#FFF8F3',
    surface: '#FFFFFF',
    text: { primary: '#2B1B12', secondary: '#6B5347', disabled: '#A98F7E' },
    border: '#A5825F',
    activeTabBg: 'rgba(194, 65, 12, 0.10)',
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
  violet: {
    primary: '#6D28D9',
    primaryLight: '#8B5CF6',
    primaryDark: '#5B21B6',
    accent: '#A21CAF',
    accentLight: '#E879F9',
    success: '#2E7D32',
    warning: '#B45309',
    error: '#C62828',
    background: '#FAF8FF',
    surface: '#FFFFFF',
    text: { primary: '#201A2B', secondary: '#5D5570', disabled: '#9A8FAF' },
    border: '#9A8BB8',
    activeTabBg: 'rgba(109, 40, 217, 0.10)',
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
  slate: {
    primary: '#60A5FA',
    primaryLight: '#93C5FD',
    primaryDark: '#3B82F6',
    accent: '#2DD4BF',
    accentLight: '#5EEAD4',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    background: '#0F172A',
    surface: '#1E293B',
    text: { primary: '#F1F5F9', secondary: '#94A3B8', disabled: '#64748B' },
    border: '#64748B',
    activeTabBg: 'rgba(96, 165, 250, 0.16)',
    onPrimary: '#0F172A',
    onAccent: '#0F172A',
  },
  teal: {
    primary: '#0E7490',
    primaryLight: '#0891B2',
    primaryDark: '#155E75',
    accent: '#BE123C',
    accentLight: '#FB7185',
    success: '#2E7D32',
    warning: '#B45309',
    error: '#C62828',
    background: '#F2FBFC',
    surface: '#FFFFFF',
    text: { primary: '#0F2027', secondary: '#4B6672', disabled: '#8AAAB2' },
    border: '#6D9CA4',
    activeTabBg: 'rgba(14, 116, 144, 0.10)',
    onPrimary: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
};

const VALID_THEME_IDS = new Set<string>(Object.keys(themes));

/** Same "unrecognized id silently falls back to default" rule as the backend and Angular. */
export function resolveThemeId(themeId: string | null | undefined): ThemeId {
  return themeId && VALID_THEME_IDS.has(themeId) ? (themeId as ThemeId) : DEFAULT_THEME_ID;
}
