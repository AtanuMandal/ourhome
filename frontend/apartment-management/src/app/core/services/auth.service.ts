import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthState, LoginResponse, PasswordResetRequestResponse } from '../models/user.model';

const TOKEN_KEY    = 'am_token';
const USER_KEY     = 'am_user';
const SOCIETY_KEY  = 'am_society';
const APARTMENT_KEY = 'am_apartment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  // ── Signals ────────────────────────────────────────────────────────────────
  private readonly _state = signal<AuthState>({
    user:      this.loadUser(),
    token:     localStorage.getItem(TOKEN_KEY),
    societyId: localStorage.getItem(SOCIETY_KEY),
    apartmentId: localStorage.getItem(APARTMENT_KEY),
  });

  readonly user      = computed(() => this._state().user);
  readonly token     = computed(() => this._state().token);
  readonly societyId = computed(() => this._state().societyId);
  readonly apartmentId = computed(() => this._state().apartmentId);
  readonly isLoggedIn = computed(() => !!this._state().token && !!this._state().user);
  readonly isAdmin = computed(() => {
    const role = this._state().user?.role;
    return role === 'SUAdmin' || role === 'HQAdmin';
  });

  // ── Auth flow ──────────────────────────────────────────────────────────────
  login(email: string, password: string, selectedUserId?: string) {
    return this.http.post<LoginResponse>(
      `${environment.apiBaseUrl}/auth/login`,
      { email, password, selectedUserId }
    ).pipe(
      tap(res => {
        if (!res.requiresSelection && res.token && res.user) {
          this.persistSession(res.token, res.user, res.user.societyId,res.user.apartmentId);
        }
      })
    );
  }

  requestPasswordReset(email: string, selectedUserId?: string) {
    return this.http.post<PasswordResetRequestResponse>(
      `${environment.apiBaseUrl}/auth/password-reset/request`,
      { email, selectedUserId }
    );
  }

  confirmPasswordReset(societyId: string, userId: string, otpCode: string, newPassword: string) {
    return this.http.post<boolean>(
      `${environment.apiBaseUrl}/auth/password-reset/confirm`,
      { societyId, userId, otpCode, newPassword }
    );
  }

  verifyOtp(societyId: string, userId: string, otp: string) {
    return this.http.post<{ accessToken: string; user: User }>(
      `${environment.apiBaseUrl}/societies/${societyId}/users/${userId}/verify-otp`,
      { otpCode: otp }
    ).pipe(
      tap(res => {
        this.persistSession(res.accessToken, res.user, societyId);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SOCIETY_KEY);
    localStorage.removeItem(APARTMENT_KEY);
    this._state.set({ user: null, token: null, societyId: null, apartmentId: null });
    this.router.navigate(['/auth/login']);
  }

  setSociety(id: string) {
    localStorage.setItem(SOCIETY_KEY, id);
    this._state.update(s => ({ ...s, societyId: id }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private persistSession(token: string, user: User, societyId: string,apartmentId?: string) {
    localStorage.setItem(TOKEN_KEY,   token);
    localStorage.setItem(USER_KEY,    JSON.stringify(user));
    localStorage.setItem(SOCIETY_KEY, societyId);
    localStorage.setItem('am_apartment', apartmentId ?? '');
    this._state.set({ user, token, societyId, apartmentId: apartmentId ?? null });
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  }
}
