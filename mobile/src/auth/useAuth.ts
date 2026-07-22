import { useAuthStore } from '../store/authStore';
import * as tokenStore from './tokenStore';
import { authApi } from '../api/endpoints/auth';
import type { User, ResidentType, AuthUserDto } from '../api/types';

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, selectedUserId?: string) => Promise<void>;
  loginWithOtp: (societyId: string, userId: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

function toUser(dto: AuthUserDto): User {
  return {
    id: dto.id,
    sid: dto.sid,
    fn: dto.nm,
    em: dto.em,
    ph: dto.ph ?? '',
    rl: dto.rl,
    rt: (dto.rt as ResidentType) ?? 'Owner',
    aid: dto.aid ?? undefined,
    vf: dto.vf,
    ac: true,
  };
}

export function useAuth(): UseAuthReturn {
  const { user, token, isAuthenticated, setUser, clearAuth } = useAuthStore();

  async function login(email: string, password: string, selectedUserId?: string): Promise<void> {
    const response = await authApi.login({ email, password, selectedUserId });

    if (response.rs || !response.tok || !response.usr) {
      // Multi-society account: caller should present options and re-call with selectedUserId
      const err = new Error('REQUIRES_SELECTION');
      (err as Error & { options: typeof response.opts }).options = response.opts;
      throw err;
    }

    await tokenStore.setToken(response.tok);
    setUser(toUser(response.usr), response.tok);
  }

  async function loginWithOtp(societyId: string, userId: string, otpCode: string): Promise<void> {
    const response = await authApi.verifyOtpLogin(societyId, userId, otpCode);
    await tokenStore.setToken(response.tok);
    setUser(toUser(response.usr), response.tok);
  }

  async function logout(): Promise<void> {
    await tokenStore.clearTokens();
    clearAuth();
  }

  return { user, token, isAuthenticated, login, loginWithOtp, logout };
}
