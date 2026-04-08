import { Routes } from '@angular/router';

export const NOTICE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./notice-list.component').then(m => m.NoticeListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./notice-form.component').then(m => m.NoticeFormComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./notice-detail.component').then(m => m.NoticeDetailComponent),
  },
];
