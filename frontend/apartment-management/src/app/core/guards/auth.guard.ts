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

  const role = auth.user()?.rl;
  const allowed = role === 'SUAdmin' || role === 'SUUser' || role === 'SUSecurity';
  if (allowed) return true;

  router.navigate(['/dashboard']);
  return false;
};

/** Staff attendance / SOS alert management is not resident-facing — only SUAdmin and SUSecurity may access it. */
export const staffGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }

  const role = auth.user()?.rl;
  const allowed = role === 'SUAdmin' || role === 'SUSecurity';
  if (allowed) return true;

  router.navigate(['/dashboard']);
  return false;
};

/** Platform-level HQ area (society directory, HQ user management) — HQAdmin and HQUser only. */
export const hqGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isHq()) return true;

  router.navigate(['/dashboard']);
  return false;
};

/** HQ actions that mutate platform state (create/activate/deactivate) — HQAdmin only, HQUser is read-only. */
export const hqAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isHqAdmin()) return true;

  router.navigate(['/dashboard']);
  return false;
};

/** Aggregate/society-wide financial reporting (e.g. society summary) — tenants keep their own
 *  apartment ledger/personal statement, but not society-wide reports. */
export const notTenantGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (auth.isTenant()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
