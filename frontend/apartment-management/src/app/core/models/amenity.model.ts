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
  status: string;
  adminNotes?: string;
  duration: number;
  createdAt: string;
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
