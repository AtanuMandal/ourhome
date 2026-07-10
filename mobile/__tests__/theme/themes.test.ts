import { themes, THEME_LABELS, DEFAULT_THEME_ID, resolveThemeId } from '../../src/theme/themes';

describe('themes', () => {
  const ids = Object.keys(themes) as (keyof typeof themes)[];

  it('defines exactly the six approved themes', () => {
    expect(ids.sort()).toEqual(['emerald', 'ocean', 'slate', 'sunset', 'teal', 'violet']);
  });

  it('gives every theme the full color-token shape', () => {
    for (const id of ids) {
      const theme = themes[id];
      expect(theme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.primaryDark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.surface).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.onPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.onAccent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.text.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.text.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.text.disabled).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(typeof THEME_LABELS[id]).toBe('string');
      expect(THEME_LABELS[id].length).toBeGreaterThan(0);
    }
  });

  it('defaults to ocean', () => {
    expect(DEFAULT_THEME_ID).toBe('ocean');
  });

  it('slate (the dark theme) uses dark text on its vivid buttons instead of white', () => {
    expect(themes.slate.onPrimary).toBe('#0F172A');
    expect(themes.slate.onAccent).toBe('#0F172A');
  });

  describe('resolveThemeId', () => {
    it('passes through a known theme id', () => {
      expect(resolveThemeId('violet')).toBe('violet');
    });

    it('falls back to the default for an unknown id', () => {
      expect(resolveThemeId('some-retired-theme')).toBe(DEFAULT_THEME_ID);
    });

    it('falls back to the default for null/undefined', () => {
      expect(resolveThemeId(null)).toBe(DEFAULT_THEME_ID);
      expect(resolveThemeId(undefined)).toBe(DEFAULT_THEME_ID);
    });
  });
});
