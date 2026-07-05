import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import * as tokenStore from './tokenStore';
import { authenticateWithBiometric } from './biometric';
import { setAuthEventListener } from '../api/client';
import type { User, UserRole, ResidentType } from '../api/types';

interface JwtPayload {
  sub?: string;
  userId?: string;
  societyId?: string;
  // .NET ClaimTypes.Role may serialize as the short "role" key (via OutboundClaimTypeMap)
  role?: UserRole;
  // Fallback for full URI claim key that older .NET handlers emit
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: UserRole;
  email?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload {
  try {
    const parts = token.split('.');
    const base64Part = parts[1];
    if (!base64Part) return {};
    // Pad base64 string
    const padded = base64Part.padEnd(
      base64Part.length + ((4 - (base64Part.length % 4)) % 4),
      '='
    );
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    // Hermes / React Native 0.76 supports atob globally
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return {};
  }
}

interface AuthContextValue {
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isReady: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const { setUser, clearAuth } = useAuthStore();

  useEffect(() => {
    async function restoreSession(): Promise<void> {
      try {
        const storedToken = await tokenStore.getToken();
        if (storedToken) {
          const payload = decodeJwtPayload(storedToken);
          const exp = payload.exp;
          const isValid = exp ? exp * 1000 > Date.now() : false;

          if (isValid) {
            const biometricPassed = await authenticateWithBiometric();
            if (biometricPassed) {
              const role: UserRole =
                payload.role ??
                payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
                'SUUser';
              const user: User = {
                id: payload.sub ?? payload.userId ?? '',
                societyId: payload.societyId ?? '',
                fullName: payload.email ?? '',  // fullName not in JWT; use email as fallback
                email: payload.email ?? '',
                phone: '',
                role,
                residentType: 'Owner',
                isVerified: true,
                isActive: true,
              };
              setUser(user, storedToken);
            } else {
              await tokenStore.clearTokens();
              clearAuth();
            }
          } else {
            await tokenStore.clearTokens();
            clearAuth();
          }
        }
      } catch {
        await tokenStore.clearTokens();
        clearAuth();
      } finally {
        setIsReady(true);
      }
    }

    void restoreSession();

    setAuthEventListener(() => {
      clearAuth();
    });
  }, [clearAuth, setUser]);

  if (!isReady) return null;

  return (
    <AuthContext.Provider value={{ isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}
