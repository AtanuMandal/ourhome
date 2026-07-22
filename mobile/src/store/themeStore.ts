import { create } from 'zustand';
import { societyApi } from '../api/endpoints/society';
import { DEFAULT_THEME_ID, resolveThemeId, type ThemeId } from '../theme/themes';
import { resolveFileUrl } from '../camera/imageUpload';

type ThemeStatus = 'idle' | 'resolving' | 'resolved';

interface ThemeState {
  themeId: ThemeId;
  status: ThemeStatus;
  /** Absolute URL, or null when no logo has been uploaded — caller falls back to the default branding. */
  logoUrl: string | null;
  /** Absolute URL, or null when no background image has been uploaded — caller shows no background layer. */
  sidenavBackgroundUrl: string | null;
}

interface ThemeActions {
  setTheme: (themeId: string | null | undefined) => void;
  /** Fetches the given society's assigned theme and branding (logo + drawer background, see
   *  requirements/account_fee_management.md) and applies them. Never throws — falls back to the
   *  default theme and no branding on any failure so a network blip can't block app startup. */
  resolveTheme: (societyId: string) => Promise<void>;
}

export const useThemeStore = create<ThemeState & ThemeActions>((set) => ({
  themeId: DEFAULT_THEME_ID,
  status: 'idle',
  logoUrl: null,
  sidenavBackgroundUrl: null,
  setTheme: (themeId) => set({ themeId: resolveThemeId(themeId), status: 'resolved' }),
  resolveTheme: async (societyId) => {
    set({ status: 'resolving' });
    try {
      const society = await societyApi.getSociety(societyId);
      set({
        themeId: resolveThemeId(society.themeId),
        status: 'resolved',
        logoUrl: society.logoUrl ? resolveFileUrl(society.logoUrl) : null,
        sidenavBackgroundUrl: society.sidenavBackgroundUrl ? resolveFileUrl(society.sidenavBackgroundUrl) : null,
      });
    } catch {
      set({ themeId: DEFAULT_THEME_ID, status: 'resolved', logoUrl: null, sidenavBackgroundUrl: null });
    }
  },
}));
