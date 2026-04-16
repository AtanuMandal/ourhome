import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },

  {
    path: 'society',
    canActivate: [authGuard],
    loadChildren: () => import('./features/society/society.routes').then(m => m.SOCIETY_ROUTES),
  },

  {
    path: 'apartments',
    canActivate: [authGuard],
    loadChildren: () => import('./features/apartments/apartments.routes').then(m => m.APARTMENT_ROUTES),
  },

  {
    path: 'residents',
    canActivate: [authGuard],
    loadChildren: () => import('./features/residents/residents.routes').then(m => m.RESIDENT_ROUTES),
  },

  {
    path: 'amenities',
    canActivate: [authGuard],
    loadChildren: () => import('./features/amenities/amenities.routes').then(m => m.AMENITY_ROUTES),
  },

  {
    path: 'complaints',
    canActivate: [authGuard],
    loadChildren: () => import('./features/complaints/complaints.routes').then(m => m.COMPLAINT_ROUTES),
  },

  {
    path: 'notices',
    canActivate: [authGuard],
    loadChildren: () => import('./features/notices/notices.routes').then(m => m.NOTICE_ROUTES),
  },

  {
    path: 'visitors',
    canActivate: [authGuard],
    loadChildren: () => import('./features/visitors/visitors.routes').then(m => m.VISITOR_ROUTES),
  },

  {
    path: 'maintenance',
    canActivate: [authGuard],
    loadChildren: () => import('./features/maintenance/maintenance.routes').then(m => m.MAINTENANCE_ROUTES),
  },

  {
    path: 'rewards',
    canActivate: [authGuard],
    loadChildren: () => import('./features/gamification/gamification.routes').then(m => m.GAMIFICATION_ROUTES),
  },

  {
    path: 'services',
    canActivate: [authGuard],
    loadChildren: () => import('./features/services/services.routes').then(m => m.SERVICE_ROUTES),
  },

  { path: '**', redirectTo: '/dashboard' },
];
