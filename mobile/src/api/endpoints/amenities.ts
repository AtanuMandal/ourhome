import api from '../client';
import type { Amenity, AmenityBooking, PaginatedResponse } from '../types';

export interface BookAmenityRequest {
  amenityId: string;
  apartmentId: string;
  /**
   * Society wall-clock time (YYYY-MM-DDTHH:mm), NOT UTC: the backend compares the
   * time of day against the amenity's operating hours.
   */
  startTime: string;
  endTime: string;
}

export interface CreateAmenityRequest {
  name: string;
  description: string;
  capacity: number;
  rules: string;
  bookingSlotMinutes: number;
  operatingStart: string;
  operatingEnd: string;
  advanceBookingDays: number;
}

export const amenitiesApi = {
  createAmenity: (societyId: string, data: CreateAmenityRequest) =>
    api.post<Amenity>(`/societies/${societyId}/amenities`, data).then((r) => r.data),

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

  // Admins receive every booking in the society; residents receive their own.
  getBookings: (societyId: string, params?: { page?: number; pageSize?: number }) =>
    api
      .get<PaginatedResponse<AmenityBooking>>(`/societies/${societyId}/amenity-bookings`, { params })
      .then((r) => r.data),

  // Owner cancels own booking; admin cancels any booking (remarks required, shown to owner).
  cancelBooking: (societyId: string, bookingId: string, remarks?: string) =>
    api
      .post<AmenityBooking>(`/societies/${societyId}/amenity-bookings/${bookingId}/cancel`, { remarks: remarks ?? null })
      .then((r) => r.data),

  approveBooking: (societyId: string, bookingId: string, adminNotes?: string) =>
    api
      .post<AmenityBooking>(`/societies/${societyId}/amenity-bookings/${bookingId}/approve`, { adminNotes: adminNotes ?? null })
      .then((r) => r.data),

  rejectBooking: (societyId: string, bookingId: string, adminNotes?: string) =>
    api
      .post<AmenityBooking>(`/societies/${societyId}/amenity-bookings/${bookingId}/reject`, { adminNotes: adminNotes ?? null })
      .then((r) => r.data),
};
