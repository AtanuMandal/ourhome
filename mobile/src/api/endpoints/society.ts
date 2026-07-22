import api from '../client';
import type { PaginatedResponse } from '../types';

export interface SocietyUserAssignment {
  uid: string; // userId
  fn: string; // fullName
  em: string; // email
  rt: string; // roleTitle
}

export interface SocietyCommittee {
  nm: string; // name
  mem: SocietyUserAssignment[]; // members
}

// Matches backend SocietyResponse — field names shortened to match its compressed JSON keys.
export interface Society {
  id: string;
  nm: string; // name
  addr: { str: string; cty: string; ste: string; pc: string; co: string }; // address
  ce: string; // contactEmail
  cp: string; // contactPhone
  tb: number; // totalBlocks
  ta: number; // totalApartments
  mot: number; // maintenanceOverdueThresholdDays
  /** Per-apartment user cap — shown on the society page; only HQAdmin can modify. */
  mua: number; // maxUsersPerApartment
  /** Hours a checked-in visitor may stay before showing in red in the visitor list. */
  voh: number; // visitorOverstayThresholdHours
  st: string; // status
  su: SocietyUserAssignment[]; // societyUsers
  cm: SocietyCommittee[]; // committees
  th: string; // themeId
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
  // Omitted means "leave unchanged". maxUsersPerApartment is HQAdmin-only.
  maxUsersPerApartment?: number;
  visitorOverstayThresholdHours?: number;
}

/** Platform-level occupancy snapshot for HQAdmin/HQUser — no financial data. */
export interface SocietySummaryReport {
  sn: string; // societyName
  st: string; // status
  ta: number; // totalApartments
  oa: number; // occupiedApartments
  va: number; // vacantApartments
  uma: number; // underMaintenanceApartments
  oc: number; // ownerCount
  tc: number; // tenantCount
  tr: number; // totalResidents
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
