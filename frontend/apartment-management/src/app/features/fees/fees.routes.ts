import { Routes } from '@angular/router';

export const FEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./fee-schedule-list.component').then(m => m.FeeScheduleListComponent),
  },
  {
    path: 'payments/:apartmentId',
    loadComponent: () => import('./payment-history.component').then(m => m.PaymentHistoryComponent),
  },
];
