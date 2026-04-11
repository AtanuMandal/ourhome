export type ApartmentStatus = 'Available' | 'Occupied' | 'UnderMaintenance';

// Matches backend ApartmentResponse DTO
export interface Apartment {
  id: string;
  societyId: string;
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
  status: ApartmentStatus;
  ownerId?: string;
  tenantId?: string;
  ownershipHistory?: ApartmentResidentHistory[];
  tenantHistory?: ApartmentResidentHistory[];
  createdAt: string;
}

export interface ApartmentResidentHistory {
  userId: string;
  fullName: string;
  fromUtc: string;
  toUtc?: string;
}

export interface ApartmentResidentHistoryResponse {
  apartmentId: string;
  apartmentNumber: string;
  currentOwnerId?: string;
  currentTenantId?: string;
  ownershipHistory: ApartmentResidentHistory[];
  tenantHistory: ApartmentResidentHistory[];
}

export interface CreateApartmentDto {
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
  ownerId?: string;
}

export interface UpdateApartmentDto {
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
}

export interface ChangeApartmentStatusDto {
  status: Extract<ApartmentStatus, 'Available' | 'UnderMaintenance'>;
  reason: string;
}

export interface BulkImportResult {
  totalRequested: number;
  succeeded: number;
  failed: number;
  errors: string[];
}
