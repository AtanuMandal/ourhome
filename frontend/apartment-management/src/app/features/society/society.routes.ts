import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const SOCIETY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./society-detail.component').then(m => m.SocietyDetailComponent),
    canActivate: [adminGuard],
  },
];
