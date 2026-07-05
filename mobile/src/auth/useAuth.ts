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
    societyId: dto.societyId,
    fullName: dto.name,
    email: dto.email,
    phone: dto.phone ?? '',
    role: dto.role,
    residentType: (dto.residentType as ResidentType) ?? 'Owner',
    apartmentId: dto.apartmentId ?? undefined,
    isVerified: dto.isVerified,
    isActive: true,
  };
}

export function useAuth(): UseAuthReturn {
  const { user, token, isAuthenticated, setUser, clearAuth } = useAuthStore();

  async function login(email: string, password: string, selectedUserId?: string): Promise<void> {
    const response = await authApi.login({ email, password, selectedUserId });

    if (response.requiresSelection || !response.token || !response.user) {
      // Multi-society account: caller should present options and re-call with selectedUserId
      const err = new Error('REQUIRES_SELECTION');
      (err as Error & { options: typeof response.options }).options = response.options;
      throw err;
    }

    await tokenStore.setToken(response.token);
    setUser(toUser(response.user), response.token);
  }

  async function loginWithOtp(societyId: string, userId: string, otpCode: string): Promise<void> {
    const response = await authApi.verifyOtpLogin(societyId, userId, otpCode);
    await tokenStore.setToken(response.accessToken);
    setUser(toUser(response.user), response.accessToken);
  }

  async function logout(): Promise<void> {
    await tokenStore.clearTokens();
    clearAuth();
  }

  return { user, token, isAuthenticated, login, loginWithOtp, logout };
}
