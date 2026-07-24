import api from '../client';
import type { Apartment, PaginatedResponse, ParkingCarNumber } from '../types';

// Matches backend CreateApartmentDto
export interface CreateApartmentRequest {
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
  carpetArea: number;
  buildUpArea: number;
  superBuildArea: number;
  ownerId?: string;
  initialResident?: {
    fullName: string;
    email: string;
    phone: string;
    residentType: 'Owner' | 'Tenant';
  };
}

// Matches backend UpdateApartmentDto
export interface UpdateApartmentRequest {
  blockName: string;
  floorNumber: number;
  numberOfRooms: number;
  parkingSlots: string[];
  carpetArea: number;
  buildUpArea: number;
  superBuildArea: number;
}

export interface ApartmentResidentHistoryEntry {
  userId: string;
  fullName: string;
  fromUtc: string;
  toUtc?: string;
}

export interface ApartmentResidentHistoryResponse {
  apartmentId: string;
  apartmentNumber: string;
  residents: { userId: string; userName: string; residentType: string }[];
  ownershipHistory: ApartmentResidentHistoryEntry[];
  tenantHistory: ApartmentResidentHistoryEntry[];
}

export const apartmentsApi = {
  getApartments: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<Apartment>>(`/societies/${societyId}/apartments`, { params })
      .then((r) => r.data),

  getApartment: (societyId: string, id: string) =>
    api
      .get<Apartment>(`/societies/${societyId}/apartments/${id}`)
      .then((r) => r.data),

  createApartment: (societyId: string, data: CreateApartmentRequest) =>
    api.post<Apartment>(`/societies/${societyId}/apartments`, data).then((r) => r.data),

  updateApartment: (societyId: string, id: string, data: UpdateApartmentRequest) =>
    api.put<Apartment>(`/societies/${societyId}/apartments/${id}`, data).then((r) => r.data),

  deleteApartment: (societyId: string, id: string) =>
    api.delete<boolean>(`/societies/${societyId}/apartments/${id}`).then((r) => r.data),

  changeStatus: (societyId: string, id: string, status: 'Available' | 'UnderMaintenance', reason: string) =>
    api.put<boolean>(`/societies/${societyId}/apartments/${id}/status`, { status, reason }).then((r) => r.data),

  getResidentHistory: (societyId: string, id: string) =>
    api
      .get<ApartmentResidentHistoryResponse>(`/societies/${societyId}/apartments/${id}/resident-history`)
      .then((r) => r.data),

  updateParking: (societyId: string, id: string, carNumbers: ParkingCarNumber[]) =>
    api.put<Apartment>(`/societies/${societyId}/apartments/${id}/parking`, { carNumbers }).then((r) => r.data),

  exportDirectory: (societyId: string) =>
    api
      .get<string>(`/societies/${societyId}/apartments/directory-report`, {
        responseType: 'text',
        transformResponse: [(data: string) => data],
      })
      .then((r) => r.data),
};
