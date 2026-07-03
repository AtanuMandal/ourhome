import api from '../client';
import type { Amenity, AmenityBooking, PaginatedResponse } from '../types';

export const amenitiesApi = {
  getAmenities: (societyId: string) =>
    api
      .get<Amenity[]>(`/societies/${societyId}/amenities`)
      .then((r) => r.data),

  getBookings: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<AmenityBooking>>(
        `/societies/${societyId}/amenities/bookings`,
        { params }
      )
      .then((r) => r.data),

  createBooking: (societyId: string, data: Partial<AmenityBooking>) =>
    api
      .post<AmenityBooking>(`/societies/${societyId}/amenities/bookings`, data)
      .then((r) => r.data),
};
