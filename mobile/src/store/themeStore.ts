import { create } from 'zustand';
import { societyApi } from '../api/endpoints/society';
import { DEFAULT_THEME_ID, resolveThemeId, type ThemeId } from '../theme/themes';

type ThemeStatus = 'idle' | 'resolving' | 'resolved';

interface ThemeState {
  themeId: ThemeId;
  status: ThemeStatus;
}

interface ThemeActions {
  setTheme: (themeId: string | null | undefined) => void;
  /** Fetches the given society's assigned theme and applies it. Never throws — falls back to
   *  the default theme on any failure so a network blip can't block app startup. */
  resolveTheme: (societyId: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState & ThemeActions>((set) => ({
  themeId: DEFAULT_THEME_ID,
  status: 'idle',
  setTheme: (themeId) => set({ themeId: resolveThemeId(themeId), status: 'resolved' }),
  resolveTheme: async (societyId) => {
    set({ status: 'resolving' });
    try {
      const society = await societyApi.getSociety(societyId);
      set({ themeId: resolveThemeId(society.th), status: 'resolved' });
    } catch {
      set({ themeId: DEFAULT_THEME_ID, status: 'resolved' });
    }
  },
}));
