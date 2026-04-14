import { Routes } from '@angular/router';

export const FEES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./fee-schedule-list.component').then(m => m.FeeScheduleListComponent) },
  { path: 'history', loadComponent: () => import('./fee-history.component').then(m => m.FeeHistoryComponent) },
];
