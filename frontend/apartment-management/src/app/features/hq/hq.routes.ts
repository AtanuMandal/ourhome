import { Routes } from '@angular/router';
import { hqGuard, hqAdminGuard } from '../../core/guards/auth.guard';

export const HQ_ROUTES: Routes = [
  {
    path: 'societies',
    loadComponent: () => import('./hq-societies-list.component').then(m => m.HqSocietiesListComponent),
    canActivate: [hqGuard],
  },
  {
    path: 'societies/new',
    loadComponent: () => import('./hq-society-form.component').then(m => m.HqSocietyFormComponent),
    canActivate: [hqAdminGuard],
  },
  {
    path: 'societies/:id/edit',
    loadComponent: () => import('./hq-society-edit.component').then(m => m.HqSocietyEditComponent),
    canActivate: [hqAdminGuard],
  },
  {
    path: 'societies/:id/report',
    loadComponent: () => import('./hq-society-report.component').then(m => m.HqSocietyReportComponent),
    canActivate: [hqGuard],
  },
  {
    path: 'users',
    loadComponent: () => import('./hq-users-list.component').then(m => m.HqUsersListComponent),
    canActivate: [hqGuard],
  },
];
