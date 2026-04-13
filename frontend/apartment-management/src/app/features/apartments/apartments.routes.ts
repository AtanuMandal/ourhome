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
    path: ':id/edit',
    loadComponent: () => import('./apartment-form.component').then(m => m.ApartmentFormComponent),
  },
  {
    path: ':id/resident-history',
    loadComponent: () => import('./apartment-resident-history.component').then(m => m.ApartmentResidentHistoryComponent),
  },
  {
    path: ':id/transfer-owner',
    loadComponent: () => import('./apartment-transfer-resident.component').then(m => m.ApartmentTransferResidentComponent),
    data: { action: 'owner' },
  },
  {
    path: ':id/transfer-tenant',
    loadComponent: () => import('./apartment-transfer-resident.component').then(m => m.ApartmentTransferResidentComponent),
    data: { action: 'tenant' },
  },
  {
    path: ':id/add-household-member',
    loadComponent: () => import('./apartment-household-member.component').then(m => m.ApartmentHouseholdMemberComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./apartment-detail.component').then(m => m.ApartmentDetailComponent),
  },
];
