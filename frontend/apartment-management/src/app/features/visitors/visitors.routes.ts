import { Routes } from '@angular/router';

export const VISITOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./visitor-list.component').then(m => m.VisitorListComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./visitor-register.component').then(m => m.VisitorRegisterComponent),
  },
];
