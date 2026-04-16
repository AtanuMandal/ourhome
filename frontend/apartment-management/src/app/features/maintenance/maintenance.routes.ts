import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./maintenance-dashboard.component').then(m => m.MaintenanceDashboardComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./maintenance-admin.component').then(m => m.MaintenanceAdminComponent),
  },
  {
    path: 'my',
    loadComponent: () => import('./maintenance-user.component').then(m => m.MaintenanceUserComponent),
  },
];
