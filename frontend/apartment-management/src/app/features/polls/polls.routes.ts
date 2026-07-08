import { Routes } from '@angular/router';

export const POLLS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./poll-list.component').then(m => m.PollListComponent) },
  { path: 'new', loadComponent: () => import('./poll-form.component').then(m => m.PollFormComponent) },
  { path: ':id', loadComponent: () => import('./poll-detail.component').then(m => m.PollDetailComponent) },
];
