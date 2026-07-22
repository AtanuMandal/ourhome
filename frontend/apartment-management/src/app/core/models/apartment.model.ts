export type ApartmentStatus = 'Available' | 'Occupied' | 'UnderMaintenance';

// Matches backend ApartmentResponse DTO — field names shortened to match its compressed JSON keys.
export interface Apartment {
  id: string;
  num: string; // apartmentNumber
  blk: string; // blockName
  flr: number; // floorNumber
  rms: number; // numberOfRooms
  pks: string[]; // parkingSlots
  ca: number; // carpetArea
  ba: number; // buildUpArea
  sba: number; // superBuildArea
  st: ApartmentStatus; // status
  prn?: string; // primaryResidentName
  res?: ApartmentResident[]; // residents
  oh?: ApartmentResidentHistory[]; // ownershipHistory
  th?: ApartmentResidentHistory[]; // tenantHistory
}

export interface ApartmentLabelSource {
  num: string; // apartmentNumber
  blk?: string | null; // blockName
  flr?: number | null; // floorNumber
}

export interface ApartmentResident {
  uid: string; // userId
  unm: string; // userName
  rt: 'Owner' | 'Tenant' | 'FamilyMember' | 'CoOccupant' | 'SocietyAdmin'; // residentType
}

export interface ApartmentResidentHistory {
  uid: string; // userId
  fn: string; // fullName
  fu: string; // fromUtc
  tu?: string; // toUtc
}

export interface ApartmentResidentHistoryResponse {
  num: string; // apartmentNumber
  res: ApartmentResident[]; // residents
  oh: ApartmentResidentHistory[]; // ownershipHistory
  th: ApartmentResidentHistory[]; // tenantHistory
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
  residentType: Extract<ApartmentResident['rt'], 'Owner' | 'Tenant'>;
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

  const apartmentNumber = apartment.num?.trim() ?? '';
  const blockName = apartment.blk?.trim() ?? '';
  const floorNumber = apartment.flr;

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
