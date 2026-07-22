import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SocietyService } from './society.service';
import { environment } from '../../../environments/environment';

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
 *
 * Also exposes the society's sidenav branding (logo + content-area background image, see
 * requirements/account_fee_management.md) — fetched via the same per-society-id effect so no
 * second `GET societies/{id}` call is needed. Both are null (default branding) when the society
 * hasn't uploaded one, or for HQAdmin/HQUser who have no society of their own.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly auth = inject(AuthService);
  private readonly societyService = inject(SocietyService);

  /** Absolute URL, or null when no logo has been uploaded — caller falls back to the default asset. */
  readonly logoUrl = signal<string | null>(null);
  /** Absolute URL, or null when no background image has been uploaded — caller shows no background layer. */
  readonly sidenavBackgroundUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const societyId = this.auth.societyId();
      if (!societyId) {
        this.applyTheme(DEFAULT_THEME_ID);
        this.applyBranding(null, null);
        return;
      }

      this.societyService.get(societyId).subscribe({
        next: society => {
          this.applyTheme(society.themeId);
          this.applyBranding(society.logoUrl, society.sidenavBackgroundUrl);
        },
        error: () => {
          this.applyTheme(DEFAULT_THEME_ID);
          this.applyBranding(null, null);
        },
      });
      // logoUrl/sidenavBackgroundUrl are written from the subscribe callback above, which Angular
      // still considers "inside" this effect (the async boundary doesn't exempt it) — themeId's
      // plain DOM attribute write needed no such opt-in, but these signal writes do.
    }, { allowSignalWrites: true });
  }

  private applyTheme(themeId: string | null | undefined): void {
    const id = themeId && VALID_THEME_IDS.has(themeId) ? themeId : DEFAULT_THEME_ID;
    document.documentElement.setAttribute('data-theme', id);
  }

  /** Converts the backend's app-relative file paths (e.g. "files/society-logos/...") to absolute
   * URLs — a plain <img>/CSS background-image can't attach the JWT header an Angular HttpClient
   * request would, so these containers are served publicly (see FileContainers.PubliclyReadable). */
  private applyBranding(logoUrl: string | null | undefined, backgroundUrl: string | null | undefined): void {
    this.logoUrl.set(logoUrl ? `${environment.apiBaseUrl}/${logoUrl}` : null);
    this.sidenavBackgroundUrl.set(backgroundUrl ? `${environment.apiBaseUrl}/${backgroundUrl}` : null);
  }
}
