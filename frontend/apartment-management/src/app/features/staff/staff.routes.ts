import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/auth.guard';

export const STAFF_ROUTES: Routes = [
  // List is read-only-accessible to every society role (app.routes.ts gates '/staff' with
  // visitorGuard) — add/edit/attendance-report stay SUAdmin-only, matching the backend.
  { path: '', loadComponent: () => import('./staff-list.component').then(m => m.StaffListComponent) },
  { path: 'new', canActivate: [adminGuard], loadComponent: () => import('./staff-form.component').then(m => m.StaffFormComponent) },
  { path: 'attendance-report', canActivate: [adminGuard], loadComponent: () => import('./staff-attendance-report.component').then(m => m.StaffAttendanceReportComponent) },
  { path: 'shifts', canActivate: [adminGuard], loadComponent: () => import('./shift-list.component').then(m => m.ShiftListComponent) },
  { path: 'shifts/new', canActivate: [adminGuard], loadComponent: () => import('./shift-form.component').then(m => m.ShiftFormComponent) },
  { path: 'shifts/:id/edit', canActivate: [adminGuard], loadComponent: () => import('./shift-form.component').then(m => m.ShiftFormComponent) },
  { path: ':id/edit', canActivate: [adminGuard], loadComponent: () => import('./staff-form.component').then(m => m.StaffFormComponent) },
];
