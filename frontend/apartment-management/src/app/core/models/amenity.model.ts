// Matches backend AmenityResponse DTO
export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  description: string;
  capacity: number;
  rules: string;
  isActive: boolean;
  bookingSlotMinutes: number;
  operatingStart: string;
  operatingEnd: string;
  advanceBookingDays: number;
}

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';

// Matches backend BookingResponse DTO
export interface AmenityBooking {
  id: string;
  societyId: string;
  amenityId: string;
  amenityName: string;
  bookedByUserId: string;
  bookedByApartmentId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus | string;
  adminNotes?: string;
  duration: number;
  createdAt: string;
  // Set when the booking was cancelled — remarks are shown to the booking owner.
  cancellationRemarks?: string;
  cancelledByUserId?: string;
}

export interface AmenityAvailability {
  slots: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  isAvailable: boolean;
}

export interface CreateAmenityDto {
  name: string;
  description: string;
  capacity: number;
  rules: string;
  bookingSlotMinutes: number;
  operatingStart: string;
  operatingEnd: string;
  advanceBookingDays: number;
}

export interface BookAmenityDto {
  amenityId: string;
  userId: string;
  apartmentId: string;
  startTime: string;
  endTime: string;
}
