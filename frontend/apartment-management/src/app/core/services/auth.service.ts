import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthState, LoginResponse, PasswordResetRequestResponse, PhoneLoginOtpResponse, LoginMethod, InviteTokenValidation } from '../models/user.model';

const TOKEN_KEY        = 'am_token';
const USER_KEY         = 'am_user';
const SOCIETY_KEY      = 'am_society';
const LOGIN_METHOD_KEY = 'am_login_method';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Signals ────────────────────────────────────────────────────────────────
  private readonly _state = signal<AuthState>(this.loadInitialState());

  readonly user      = computed(() => this._state().user);
  readonly token     = computed(() => this._state().token);
  readonly societyId = computed(() => this._state().societyId);
  readonly isLoggedIn = computed(() => !!this._state().token && !!this._state().user);
  readonly isAdmin = computed(() => {
    const role = this._state().user?.role;
    return role === 'SUAdmin' || role === 'HQAdmin';
  });

  readonly isSecurity = computed(() => this._state().user?.role === 'SUSecurity');

  readonly isHqAdmin = computed(() => this._state().user?.role === 'HQAdmin');
  readonly isHqUser  = computed(() => this._state().user?.role === 'HQUser');
  readonly isHq      = computed(() => this.isHqAdmin() || this.isHqUser());

  readonly canManageVisitors = computed(() => {
    const role = this._state().user?.role;
    return role === 'SUAdmin' || role === 'SUSecurity';
  });

  // ── Auth flow ──────────────────────────────────────────────────────────────
  login(email: string, password: string, selectedUserId?: string) {
    return this.http.post<LoginResponse>(
      `${environment.apiBaseUrl}/auth/login`,
      { email, password, selectedUserId }
    ).pipe(
      tap(res => {
        if (!res.requiresSelection && res.token && res.user) {
          this.persistSession(res.token, res.user, res.user.societyId);
        }
      })
    );
  }

  requestOtpLogin(phone: string, selectedUserId?: string) {
    return this.http.post<PhoneLoginOtpResponse>(
      `${environment.apiBaseUrl}/auth/otp-login/request`,
      { phone, selectedUserId }
    );
  }

  verifyOtpLogin(societyId: string, userId: string, otp: string) {
    return this.verifyOtp(societyId, userId, otp);
  }

  getLoginMethod(): LoginMethod {
    const stored = localStorage.getItem(LOGIN_METHOD_KEY);
    return stored === 'email' ? 'email' : 'phone';
  }

  setLoginMethod(method: LoginMethod) {
    localStorage.setItem(LOGIN_METHOD_KEY, method);
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

  validateInviteToken(token: string) {
    return this.http.get<InviteTokenValidation>(
      `${environment.apiBaseUrl}/invite/validate`,
      { params: { token } }
    );
  }

  selfRegister(societyId: string, dto: { fullName: string; email: string; phone: string; password: string; inviteToken: string }) {
    return this.http.post<User>(
      `${environment.apiBaseUrl}/societies/${societyId}/auth/register`,
      dto
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
    this.clearExpiryTimer();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SOCIETY_KEY);
    this._state.set({ user: null, token: null, societyId: null });
    this.router.navigate(['/auth/login']);
  }

  setSociety(id: string) {
    localStorage.setItem(SOCIETY_KEY, id);
    this._state.update(s => ({ ...s, societyId: id }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private persistSession(token: string, user: User, societyId: string) {
    localStorage.setItem(TOKEN_KEY,   token);
    localStorage.setItem(USER_KEY,    JSON.stringify(user));
    localStorage.setItem(SOCIETY_KEY, societyId);
    this._state.set({ user, token, societyId });
    this.scheduleAutoLogout(token);
  }

  // Reads localStorage and discards any already-expired token before signals are initialised.
  private loadInitialState(): AuthState {
    const token     = localStorage.getItem(TOKEN_KEY);
    const societyId = localStorage.getItem(SOCIETY_KEY);

    if (token && this.isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SOCIETY_KEY);
      return { user: null, token: null, societyId: null };
    }

    if (token) {
      // Timer is scheduled in the constructor after signals are ready.
      this.scheduleAutoLogout(token);
    }

    return { user: this.loadUser(), token, societyId };
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  }

  private getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload['exp'] === 'number' ? payload['exp'] : null;
    } catch { return null; }
  }

  private isTokenExpired(token: string): boolean {
    const exp = this.getTokenExpiry(token);
    if (exp === null) return false; // no expiry claim — treat as valid
    return Date.now() >= exp * 1000;
  }

  private scheduleAutoLogout(token: string): void {
    this.clearExpiryTimer();
    const exp = this.getTokenExpiry(token);
    if (exp === null) return;

    const msUntilExpiry = exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      this.logout();
      return;
    }

    // Cap at 24 days to stay within setTimeout's safe integer range (~2^31 ms).
    const delay = Math.min(msUntilExpiry, 24 * 24 * 60 * 60 * 1000);
    this.expiryTimer = setTimeout(() => this.logout(), delay);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
