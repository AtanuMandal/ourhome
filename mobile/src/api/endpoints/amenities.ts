import api from '../client';
import type { Amenity, AmenityBooking } from '../types';

export interface BookAmenityRequest {
  amenityId: string;
  apartmentId: string;
  startTime: string;
  endTime: string;
}

export const amenitiesApi = {
  getAmenities: (societyId: string) =>
    api
      .get<Amenity[]>(`/societies/${societyId}/amenities`)
      .then((r) => r.data),

  // Backend: GET /amenities/{amenityId}/availability?date
  getAvailability: (societyId: string, amenityId: string, date: string) =>
    api
      .get<{ start: string; end: string; isAvailable: boolean }[]>(
        `/societies/${societyId}/amenities/${amenityId}/availability`,
        { params: { date } }
      )
      .then((r) => r.data),

  // Backend: POST /amenity-bookings (not /amenities/bookings)
  createBooking: (societyId: string, data: BookAmenityRequest) =>
    api
      .post<AmenityBooking>(`/societies/${societyId}/amenity-bookings`, data)
      .then((r) => r.data),
};
