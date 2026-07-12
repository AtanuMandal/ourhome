import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const SOS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./sos-alert-list.component').then(m => m.SosAlertListComponent) },
  {
    // Aggregate SOS report — SUAdmin only on the backend; this route was previously unreachable
    // by residents only because the parent /sos-alerts route was staff-only. Now that any
    // authenticated user can view the alert list, this sub-route needs its own guard.
    path: 'report',
    canActivate: [adminGuard],
    loadComponent: () => import('./sos-alert-report.component').then(m => m.SosAlertReportComponent),
  },
];
