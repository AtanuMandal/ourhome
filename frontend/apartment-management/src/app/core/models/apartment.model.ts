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

export interface ApartmentLabelSource {
  apartmentNumber: string;
  blockName?: string | null;
  floorNumber?: number | null;
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
  initialResident?: CreateApartmentResidentDto;
}

export interface CreateApartmentResidentDto {
  fullName: string;
  email: string;
  phone: string;
  residentType: Extract<ApartmentResident['residentType'], 'Owner' | 'Tenant'>;
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

export function formatApartmentLabel(apartment: ApartmentLabelSource | null | undefined) {
  if (!apartment) {
    return 'Assigned apartment';
  }

  const apartmentNumber = apartment.apartmentNumber?.trim() ?? '';
  const blockName = apartment.blockName?.trim() ?? '';
  const floorNumber = apartment.floorNumber;

  if (!blockName && (floorNumber === undefined || floorNumber === null)) {
    return apartmentNumber;
  }

  if (!blockName) {
    return `${floorNumber}-${apartmentNumber}`;
  }

  if (floorNumber === undefined || floorNumber === null) {
    return `${blockName} ${apartmentNumber}`;
  }

  return `${blockName} ${floorNumber}-${apartmentNumber}`;
}
