import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, visitorGuard, staffGuard, hqGuard } from './core/guards/auth.guard';

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
    canActivate: [visitorGuard],
    loadChildren: () => import('./features/residents/residents.routes').then(m => m.RESIDENT_ROUTES),
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },

  {
    path: 'contact-us',
    canActivate: [authGuard],
    loadComponent: () => import('./features/contact-us/contact-us.component').then(m => m.ContactUsComponent),
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
    canActivate: [visitorGuard],
    loadChildren: () => import('./features/visitors/visitors.routes').then(m => m.VISITOR_ROUTES),
  },

  {
    path: 'staff',
    canActivate: [staffGuard],
    loadChildren: () => import('./features/staff/staff.routes').then(m => m.STAFF_ROUTES),
  },

  {
    path: 'sos-alerts',
    canActivate: [staffGuard],
    loadChildren: () => import('./features/sos/sos.routes').then(m => m.SOS_ROUTES),
  },

  {
    path: 'polls',
    canActivate: [visitorGuard],
    loadChildren: () => import('./features/polls/polls.routes').then(m => m.POLLS_ROUTES),
  },

  {
    path: 'agm-sessions',
    canActivate: [visitorGuard],
    loadChildren: () => import('./features/polls/agm-sessions.routes').then(m => m.AGM_SESSIONS_ROUTES),
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

  {
    path: 'vendor-payments',
    canActivate: [authGuard],
    loadChildren: () => import('./features/vendor-payments/vendor-payments.routes').then(m => m.VENDOR_PAYMENT_ROUTES),
  },

  {
    path: 'financial-report',
    canActivate: [authGuard],
    loadChildren: () => import('./features/financial-report/financial-report.routes').then(m => m.FINANCIAL_REPORT_ROUTES),
  },

  {
    path: 'my-apartment',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-apartment/my-apartment.component').then(m => m.MyApartmentComponent),
  },

  {
    path: 'visitor-pass/:passCode',
    loadComponent: () => import('./features/visitors/visitor-pass-public.component').then(m => m.VisitorPassPublicComponent),
  },

  {
    path: 'hq',
    canActivate: [hqGuard],
    loadChildren: () => import('./features/hq/hq.routes').then(m => m.HQ_ROUTES),
  },

  { path: '**', redirectTo: '/dashboard' },
];
