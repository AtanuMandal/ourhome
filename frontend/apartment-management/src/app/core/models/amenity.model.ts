// Matches backend AmenityResponse DTO — field names shortened to match its compressed JSON keys.
export interface Amenity {
  id: string;
  nm: string; // name
  ds: string; // description
  cap: number; // capacity
  ac: boolean; // isActive
  os: string; // operatingStart
  oe: string; // operatingEnd
}

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';

// Matches backend BookingResponse DTO — field names shortened to match its compressed JSON keys.
export interface AmenityBooking {
  id: string;
  an: string; // amenityName
  uid: string; // bookedByUserId
  stt: string; // startTime
  ent: string; // endTime
  st: BookingStatus | string; // status
  adn?: string; // adminNotes
  // Set when the booking was cancelled — remarks are shown to the booking owner.
  cr?: string; // cancellationRemarks
  cid?: string; // cancelledByUserId
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
