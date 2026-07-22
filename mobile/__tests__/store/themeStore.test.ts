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
    (societyApi.getSociety as jest.Mock).mockResolvedValue({ th: 'slate' });

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
    (societyApi.getSociety as jest.Mock).mockResolvedValue({ th: 'retired-theme' });

    await useThemeStore.getState().resolveTheme('society-1');

    expect(useThemeStore.getState()).toMatchObject({ themeId: DEFAULT_THEME_ID, status: 'resolved' });
  });
});
