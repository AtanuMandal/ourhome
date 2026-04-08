import { Routes } from '@angular/router';

export const SERVICE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./provider-list.component').then(m => m.ProviderListComponent),
  },
  {
    path: 'providers/new',
    loadComponent: () => import('./provider-form.component').then(m => m.ProviderFormComponent),
  },
  {
    path: 'request',
    loadComponent: () => import('./request-form.component').then(m => m.RequestFormComponent),
  },
];
