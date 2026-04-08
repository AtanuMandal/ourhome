import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Amenity, AmenityBooking, AmenityAvailability, BookAmenityDto } from '../models/amenity.model';

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly api = inject(ApiService);

  list(societyId: string) {
    return this.api.get<Amenity[]>(`societies/${societyId}/amenities`);
  }

  create(societyId: string, dto: Partial<Amenity>) {
    return this.api.post<Amenity>(`societies/${societyId}/amenities`, dto);
  }

  getAvailability(societyId: string, amenityId: string, date: string) {
    return this.api.get<AmenityAvailability>(
      `societies/${societyId}/amenities/${amenityId}/availability`,
      { date }
    );
  }

  book(societyId: string, dto: BookAmenityDto) {
    return this.api.post<AmenityBooking>(`societies/${societyId}/amenity-bookings`, dto);
  }
}
