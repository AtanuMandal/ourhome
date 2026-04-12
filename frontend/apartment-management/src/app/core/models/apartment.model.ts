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
  carpetArea: number;
  buildUpArea: number;
  superBuildArea: number;
  status: ApartmentStatus;
  primaryResidentName?: string;
  residents?: ApartmentResident[];
  ownershipHistory?: ApartmentResidentHistory[];
  tenantHistory?: ApartmentResidentHistory[];
  createdAt: string;
}

export interface ApartmentResident {
  userId: string;
  userName: string;
  residentType: 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant' | 'SocietyAdmin';
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
  residents: ApartmentResident[];
  ownershipHistory: ApartmentResidentHistory[];
  tenantHistory: ApartmentResidentHistory[];
}

export interface CreateApartmentDto {
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
  carpetArea: number;
  buildUpArea: number;
  superBuildArea: number;
  ownerId?: string;
}

export interface UpdateApartmentDto {
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
  carpetArea: number;
  buildUpArea: number;
  superBuildArea: number;
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
