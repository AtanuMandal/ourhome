import { useAuthStore } from '../store/authStore';
import * as tokenStore from './tokenStore';
import { authApi } from '../api/endpoints/auth';
import type { User, ResidentType } from '../api/types';

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, selectedUserId?: string) => Promise<void>;
  logout: () => Promise<void>;
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

    const userObj: User = {
      id: response.user.id,
      societyId: response.user.societyId,
      fullName: response.user.name,
      email: response.user.email,
      phone: response.user.phone ?? '',
      role: response.user.role,
      residentType: (response.user.residentType as ResidentType) ?? 'Owner',
      apartmentId: response.user.apartmentId ?? undefined,
      isVerified: response.user.isVerified,
      isActive: true,
    };
    setUser(userObj, response.token);
  }

  async function logout(): Promise<void> {
    await tokenStore.clearTokens();
    clearAuth();
  }

  return { user, token, isAuthenticated, login, logout };
}
