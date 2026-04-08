import { Routes } from '@angular/router';

export const APARTMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./apartment-list.component').then(m => m.ApartmentListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./apartment-form.component').then(m => m.ApartmentFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./apartment-detail.component').then(m => m.ApartmentDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./apartment-form.component').then(m => m.ApartmentFormComponent),
  },
];
