import { Routes } from '@angular/router';

export const STAFF_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./staff-list.component').then(m => m.StaffListComponent) },
  { path: 'new', loadComponent: () => import('./staff-form.component').then(m => m.StaffFormComponent) },
  { path: 'attendance-report', loadComponent: () => import('./staff-attendance-report.component').then(m => m.StaffAttendanceReportComponent) },
  { path: ':id/edit', loadComponent: () => import('./staff-form.component').then(m => m.StaffFormComponent) },
];
