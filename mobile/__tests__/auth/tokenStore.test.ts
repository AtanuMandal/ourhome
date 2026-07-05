import * as SecureStore from 'expo-secure-store';
import * as tokenStore from '../../src/auth/tokenStore';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('tokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getToken returns null when not set', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const result = await tokenStore.getToken();
    expect(result).toBeNull();
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('ourhome_jwt');
  });

  test('setToken and getToken roundtrip', async () => {
    const testToken = 'test-jwt-token';
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(testToken);

    await tokenStore.setToken(testToken);
    const result = await tokenStore.getToken();

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('ourhome_jwt', testToken);
    expect(result).toBe(testToken);
  });

  test('clearTokens removes both keys', async () => {
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

    await tokenStore.clearTokens();

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('ourhome_jwt');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('ourhome_refresh_jwt');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
