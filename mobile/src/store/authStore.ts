import { create } from 'zustand';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /**
   * Apartment picked in the drawer by a user linked to several apartments — menus and
   * apartment-scoped features follow the role held on this apartment. Null means
   * "use the primary apartment".
   */
  selectedApartmentId: string | null;
}

interface AuthActions {
  setUser: (user: User, token: string) => void;
  setSelectedApartment: (apartmentId: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  selectedApartmentId: null,
  setUser: (user, token) => set({ user, token, isAuthenticated: true }),
  setSelectedApartment: (apartmentId) => set({ selectedApartmentId: apartmentId }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false, selectedApartmentId: null }),
}));
