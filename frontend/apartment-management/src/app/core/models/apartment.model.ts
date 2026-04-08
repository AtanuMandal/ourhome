export type ApartmentStatus = 'Available' | 'Occupied' | 'UnderMaintenance';

// Matches backend ApartmentResponse DTO
export interface Apartment {
  id: string;
  societyId: string;
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: number;
  status: ApartmentStatus;
  ownerId?: string;
  tenantId?: string;
  createdAt: string;
}

export interface CreateApartmentDto {
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: number;
  ownerId?: string;
}

export interface UpdateApartmentDto {
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: number;
}
