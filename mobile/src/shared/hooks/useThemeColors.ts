import { useThemeStore } from '../../store/themeStore';
import { themes, type ColorTokens } from '../../theme/themes';

/**
 * Reactive theme colors for the handful of high-traffic chrome components (header, drawer)
 * that should reflect a theme change within the current session rather than waiting for the
 * next login/app restart, unlike the ~49 screens that read the static `colors` export.
 */
export function useThemeColors(): ColorTokens {
  const themeId = useThemeStore((state) => state.themeId);
  return themes[themeId];
}
