import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../../src/auth/useAuth';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/endpoints/auth';

jest.mock('../../src/auth/tokenStore', () => ({
  setToken: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/api/endpoints/auth', () => ({
  authApi: {
    login: jest.fn(),
    verifyOtpLogin: jest.fn(),
  },
}));

describe('useAuth.loginWithOtp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  test('stores the token and maps the returned user on success', async () => {
    (authApi.verifyOtpLogin as jest.Mock).mockResolvedValue({
      tok: 'jwt-token',
      usr: {
        id: 'u1',
        sid: 'soc-1',
        nm: 'Alice',
        em: 'alice@example.com',
        ph: '+91-9876543210',
        rl: 'SUUser',
        rt: 'Owner',
        aid: 'apt-1',
        vf: true,
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.loginWithOtp('soc-1', 'u1', '123456');
    });

    expect(authApi.verifyOtpLogin).toHaveBeenCalledWith('soc-1', 'u1', '123456');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.fn).toBe('Alice');
    expect(useAuthStore.getState().token).toBe('jwt-token');
  });

  test('propagates errors from an invalid OTP without authenticating', async () => {
    (authApi.verifyOtpLogin as jest.Mock).mockRejectedValue(new Error('OTP is invalid or has expired.'));

    const { result } = renderHook(() => useAuth());

    await expect(
      act(async () => {
        await result.current.loginWithOtp('soc-1', 'u1', '000000');
      })
    ).rejects.toThrow('OTP is invalid or has expired.');

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
