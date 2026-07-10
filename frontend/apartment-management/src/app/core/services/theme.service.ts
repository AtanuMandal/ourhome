import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SocietyService } from './society.service';

export interface ThemeDefinition {
  id: string;
  label: string;
  /** Swatch color shown in theme pickers — matches --primary for that theme in styles.scss. */
  primary: string;
}

/** Keep in sync with the six :root[data-theme='...'] blocks in styles.scss and the backend's ValidThemeIds. */
export const THEMES: ThemeDefinition[] = [
  { id: 'ocean', label: 'Ocean Blue', primary: '#1565C0' },
  { id: 'emerald', label: 'Emerald Green', primary: '#15803D' },
  { id: 'sunset', label: 'Sunset Amber', primary: '#C2410C' },
  { id: 'violet', label: 'Royal Violet', primary: '#6D28D9' },
  { id: 'slate', label: 'Slate Dark', primary: '#60A5FA' },
  { id: 'teal', label: 'Teal Lagoon', primary: '#0E7490' },
];

export const DEFAULT_THEME_ID = 'ocean';

const VALID_THEME_IDS = new Set(THEMES.map(theme => theme.id));

/**
 * Applies the current user's society theme to <html data-theme="...">. Every hand-rolled
 * component color already flows through the CSS custom properties defined per data-theme
 * block in styles.scss, so setting this one attribute re-themes the whole app instantly —
 * no reload needed. HQAdmin/HQUser (platform roles, no society of their own) always see the
 * default theme, matching how society-scoped theming was designed to be applied.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly auth = inject(AuthService);
  private readonly societyService = inject(SocietyService);

  constructor() {
    effect(() => {
      const societyId = this.auth.societyId();
      if (!societyId) {
        this.applyTheme(DEFAULT_THEME_ID);
        return;
      }

      this.societyService.get(societyId).subscribe({
        next: society => this.applyTheme(society.themeId),
        error: () => this.applyTheme(DEFAULT_THEME_ID),
      });
    });
  }

  private applyTheme(themeId: string | null | undefined): void {
    const id = themeId && VALID_THEME_IDS.has(themeId) ? themeId : DEFAULT_THEME_ID;
    document.documentElement.setAttribute('data-theme', id);
  }
}
