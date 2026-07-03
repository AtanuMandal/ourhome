import { useAuthStore } from '../store/authStore';
import * as tokenStore from './tokenStore';
import { authApi } from '../api/endpoints/auth';
import type { User } from '../api/types';

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, token, isAuthenticated, setUser, clearAuth } = useAuthStore();

  async function login(email: string, password: string): Promise<void> {
    const response = await authApi.login({ email, password });
    await tokenStore.setToken(response.token);

    const userObj: User = {
      id: response.userId,
      societyId: response.societyId,
      fullName: response.fullName,
      email: response.email,
      phone: '',
      role: response.role,
      residentType: 'Owner',
      isVerified: true,
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
