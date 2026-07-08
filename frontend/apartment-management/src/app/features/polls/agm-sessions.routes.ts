import { Routes } from '@angular/router';

export const AGM_SESSIONS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./agm-session-list.component').then(m => m.AgmSessionListComponent) },
  { path: 'new', loadComponent: () => import('./agm-session-form.component').then(m => m.AgmSessionFormComponent) },
  { path: ':id', loadComponent: () => import('./agm-session-detail.component').then(m => m.AgmSessionDetailComponent) },
];
