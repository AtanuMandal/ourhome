import { Routes } from '@angular/router';

export const RESIDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./resident-list.component').then(m => m.ResidentListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./resident-profile.component').then(m => m.ResidentProfileComponent),
  },
];
