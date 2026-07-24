import { useThemeStore } from '../../src/store/themeStore';
import { societyApi } from '../../src/api/endpoints/society';
import { DEFAULT_THEME_ID } from '../../src/theme/themes';

jest.mock('../../src/api/endpoints/society', () => ({
  societyApi: { getSociety: jest.fn() },
}));

describe('themeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeStore.setState({ themeId: DEFAULT_THEME_ID, status: 'idle' });
  });

  test('setTheme normalizes and resolves an unknown id to the default', () => {
    useThemeStore.getState().setTheme('not-a-real-theme');

    expect(useThemeStore.getState()).toMatchObject({ themeId: DEFAULT_THEME_ID, status: 'resolved' });
  });

  test('setTheme accepts a known id', () => {
    useThemeStore.getState().setTheme('violet');

    expect(useThemeStore.getState()).toMatchObject({ themeId: 'violet', status: 'resolved' });
  });

  test('resolveTheme fetches the society and applies its theme', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue({ themeId: 'slate' });

    const promise = useThemeStore.getState().resolveTheme('society-1');
    expect(useThemeStore.getState().status).toBe('resolving');
    await promise;

    expect(societyApi.getSociety).toHaveBeenCalledWith('society-1');
    expect(useThemeStore.getState()).toMatchObject({ themeId: 'slate', status: 'resolved' });
  });

  test('resolveTheme falls back to the default theme without throwing if the fetch fails', async () => {
    (societyApi.getSociety as jest.Mock).mockRejectedValue(new Error('network error'));

    await expect(useThemeStore.getState().resolveTheme('society-1')).resolves.toBeUndefined();

    expect(useThemeStore.getState()).toMatchObject({ themeId: DEFAULT_THEME_ID, status: 'resolved' });
  });

  test('resolveTheme normalizes an unrecognized theme id from the server', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue({ themeId: 'retired-theme' });

    await useThemeStore.getState().resolveTheme('society-1');

    expect(useThemeStore.getState()).toMatchObject({ themeId: DEFAULT_THEME_ID, status: 'resolved' });
  });

  test('resolveTheme resolves logoUrl/sidenavBackgroundUrl to absolute URLs when the society has uploaded branding images', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue({
      themeId: 'ocean',
      logoUrl: 'files/society-logos/soc-1/abc.png',
      sidenavBackgroundUrl: 'files/society-backgrounds/soc-1/def.jpg',
    });

    await useThemeStore.getState().resolveTheme('society-1');

    const { logoUrl, sidenavBackgroundUrl } = useThemeStore.getState();
    expect(logoUrl?.endsWith('/files/society-logos/soc-1/abc.png')).toBe(true);
    expect(sidenavBackgroundUrl?.endsWith('/files/society-backgrounds/soc-1/def.jpg')).toBe(true);
  });

  test('resolveTheme leaves logoUrl/sidenavBackgroundUrl null when the society has not uploaded either', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue({ themeId: 'ocean' });

    await useThemeStore.getState().resolveTheme('society-1');

    expect(useThemeStore.getState()).toMatchObject({ logoUrl: null, sidenavBackgroundUrl: null });
  });

  test('resolveTheme clears logoUrl/sidenavBackgroundUrl to null if the fetch fails', async () => {
    (societyApi.getSociety as jest.Mock).mockRejectedValue(new Error('network error'));

    await useThemeStore.getState().resolveTheme('society-1');

    expect(useThemeStore.getState()).toMatchObject({ logoUrl: null, sidenavBackgroundUrl: null });
  });
});
