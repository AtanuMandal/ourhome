import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const VENDOR_PAYMENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./vendor-payments-admin.component').then(m => m.VendorPaymentsAdminComponent),
  },
  {
    path: 'grid',
    canActivate: [adminGuard],
    loadComponent: () => import('./vendor-payments-grid.component').then(m => m.VendorPaymentsGridComponent),
  },
];
