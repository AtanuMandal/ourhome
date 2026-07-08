import * as SecureStore from 'expo-secure-store';
import * as loginPreference from '../../src/auth/loginPreference';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('loginPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getLoginMethod defaults to phone when nothing stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    const result = await loginPreference.getLoginMethod();
    expect(result).toBe('phone');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('ourhome_login_method');
  });

  test('getLoginMethod returns email when stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('email');
    const result = await loginPreference.getLoginMethod();
    expect(result).toBe('email');
  });

  test('setLoginMethod persists the preference', async () => {
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    await loginPreference.setLoginMethod('email');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('ourhome_login_method', 'email');
  });
});
