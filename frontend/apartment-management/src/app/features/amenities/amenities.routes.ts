import { Routes } from '@angular/router';

export const AMENITY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./amenity-list.component').then(m => m.AmenityListComponent),
  },
  {
    path: 'book/:id',
    loadComponent: () => import('./booking-form.component').then(m => m.BookingFormComponent),
  },
];
