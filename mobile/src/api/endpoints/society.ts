import api from '../client';

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
  contactEmail: string;
  contactPhone: string;
  totalBlocks: number;
  totalApartments: number;
  maintenanceOverdueThresholdDays: number;
  societyUsers: SocietyUserAssignment[];
  committees: SocietyCommittee[];
}

export interface UpdateSocietyRequest {
  name: string;
  contactEmail: string;
  contactPhone: string;
  totalBlocks: number;
  totalApartments: number;
  maintenanceOverdueThresholdDays: number;
  societyUsers: { email: string; roleTitle: string }[];
  committees: { name: string; members: { email: string; roleTitle: string }[] }[];
}

export const societyApi = {
  getSociety: (societyId: string) =>
    api.get<Society>(`/societies/${societyId}`).then((r) => r.data),

  updateSociety: (societyId: string, data: UpdateSocietyRequest) =>
    api.put<Society>(`/societies/${societyId}`, data).then((r) => r.data),
};
