import { Routes } from '@angular/router';

export const SOS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./sos-alert-list.component').then(m => m.SosAlertListComponent) },
  { path: 'report', loadComponent: () => import('./sos-alert-report.component').then(m => m.SosAlertReportComponent) },
];
