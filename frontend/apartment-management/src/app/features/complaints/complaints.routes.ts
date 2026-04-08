import { Routes } from '@angular/router';

export const COMPLAINT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./complaint-list.component').then(m => m.ComplaintListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./complaint-form.component').then(m => m.ComplaintFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./complaint-detail.component').then(m => m.ComplaintDetailComponent),
  },
];
