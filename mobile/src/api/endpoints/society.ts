import api from '../client';
import type { PaginatedResponse } from '../types';

export interface SocietyUserAssignment {
  userId: string;
  fullName: string;
  email: string;
  roleTitle: string;
}

export interface SocietyCommittee {
  name: string;
  members: SocietyUserAssignment[];
}

export interface Society {
  id: string;
  name: string;
  address: { street: string; city: string; state: string; postalCode: string; country: string };
  contactEmail: string;
  contactPhone: string;
  totalBlocks: number;
  totalApartments: number;
  maintenanceOverdueThresholdDays: number;
  status: string;
  societyUsers: SocietyUserAssignment[];
  committees: SocietyCommittee[];
  themeId: string;
}

export interface UpdateSocietyRequest {
  name: string;
  contactEmail: string;
  contactPhone: string;
  totalBlocks: number;
  totalApartments: number;
  maintenanceOverdueThresholdDays: number;
  // Omitted entirely means "leave unchanged" — used by the HQAdmin edit flow, which never
  // touches society governance (societyUsers/committees) or the society's admin user.
  societyUsers?: { email: string; roleTitle: string }[];
  committees?: { name: string; members: { email: string; roleTitle: string }[] }[];
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  themeId?: string;
}

/** Platform-level occupancy snapshot for HQAdmin/HQUser — no financial data. */
export interface SocietySummaryReport {
  societyId: string;
  societyName: string;
  status: string;
  totalApartments: number;
  occupiedApartments: number;
  vacantApartments: number;
  underMaintenanceApartments: number;
  ownerCount: number;
  tenantCount: number;
  totalResidents: number;
}

export interface CreateSocietyRequest {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  totalBlocks: number;
  totalApartments: number;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
}

/** Returned when a society is registered — includes the society and the first admin account created with it. */
export interface CreateSocietyResponse {
  society: Society;
  admin: { id: string; fullName: string; email: string; role: string };
}

export const societyApi = {
  getSociety: (societyId: string) =>
    api.get<Society>(`/societies/${societyId}`).then((r) => r.data),

  updateSociety: (societyId: string, data: UpdateSocietyRequest) =>
    api.put<Society>(`/societies/${societyId}`, data).then((r) => r.data),

  listSocieties: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Society>>('/societies', { params }).then((r) => r.data),

  createSociety: (data: CreateSocietyRequest) =>
    api.post<CreateSocietyResponse>('/societies', data).then((r) => r.data),

  activateSociety: (societyId: string) =>
    api.post<boolean>(`/societies/${societyId}/activate`).then((r) => r.data),

  deactivateSociety: (societyId: string) =>
    api.post<boolean>(`/societies/${societyId}/deactivate`).then((r) => r.data),

  getSummaryReport: (societyId: string) =>
    api.get<SocietySummaryReport>(`/societies/${societyId}/report`).then((r) => r.data),
};
