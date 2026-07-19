import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Amenity, AmenityBooking, BookAmenityDto, CreateAmenityDto } from '../models/amenity.model';

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly api = inject(ApiService);

  list(societyId: string) {
    return this.api.get<Amenity[]>(`societies/${societyId}/amenities`);
  }

  create(societyId: string, dto: CreateAmenityDto) {
    return this.api.post<Amenity>(`societies/${societyId}/amenities`, dto);
  }

  getAvailability(societyId: string, amenityId: string, date: string) {
    return this.api.get<any>(
      `societies/${societyId}/amenities/${amenityId}/availability`,
      { date }
    );
  }

  book(societyId: string, dto: BookAmenityDto) {
    return this.api.post<AmenityBooking>(`societies/${societyId}/amenity-bookings`, dto);
  }

  // Admins receive every booking in the society; residents receive their own.
  listBookings(societyId: string, page = 1, pageSize = 50) {
    return this.api.getPaged<AmenityBooking>(`societies/${societyId}/amenity-bookings`, page, pageSize);
  }

  cancelBooking(societyId: string, bookingId: string, remarks?: string) {
    return this.api.post<AmenityBooking>(
      `societies/${societyId}/amenity-bookings/${bookingId}/cancel`, { remarks: remarks ?? null });
  }

  approveBooking(societyId: string, bookingId: string, adminNotes?: string) {
    return this.api.post<AmenityBooking>(
      `societies/${societyId}/amenity-bookings/${bookingId}/approve`, { adminNotes: adminNotes ?? null });
  }

  rejectBooking(societyId: string, bookingId: string, adminNotes?: string) {
    return this.api.post<AmenityBooking>(
      `societies/${societyId}/amenity-bookings/${bookingId}/reject`, { adminNotes: adminNotes ?? null });
  }
}
