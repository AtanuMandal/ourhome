import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isAdmin()) return true;

  router.navigate(['/dashboard']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return true;

  router.navigate(['/dashboard']);
  return false;
};

/** Allows any authenticated society user (SUAdmin, SUUser, SUSecurity). HQ-only users are excluded. */
export const visitorGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }

  const role = auth.user()?.role;
  const allowed = role === 'SUAdmin' || role === 'SUUser' || role === 'SUSecurity';
  if (allowed) return true;

  router.navigate(['/dashboard']);
  return false;
};

/** Staff attendance is not resident-facing — only SUAdmin and SUSecurity may access it. */
export const staffGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }

  const role = auth.user()?.role;
  const allowed = role === 'SUAdmin' || role === 'SUSecurity';
  if (allowed) return true;

  router.navigate(['/dashboard']);
  return false;
};
