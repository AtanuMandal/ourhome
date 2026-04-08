export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  description?: string;
  type: 'Pool' | 'Gym' | 'Clubhouse' | 'Garden' | 'Court' | 'Other';
  capacity: number;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  imageUrl?: string;
}

export interface AmenityBooking {
  id: string;
  societyId: string;
  amenityId: string;
  amenityName?: string;
  userId: string;
  userName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedBy?: string;
}

export interface AmenityAvailability {
  amenityId: string;
  date: string;
  slots: TimeSlot[];
}

export interface BookAmenityDto {
  amenityId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  userId: string;
}
