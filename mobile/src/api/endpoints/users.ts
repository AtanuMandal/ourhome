import api from '../client';
import type { User } from '../types';

export interface InviteLink {
  token: string;
  inviteUrl: string;
}

export interface RegisterUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  residentType: string;
  apartmentId?: string;
  invitedByUserId?: string;
}

export interface TransferResidentRequest {
  fullName: string;
  email: string;
  phone: string;
}

/** User administration + household/apartment membership — mirrors the web UserService. */
export const usersApi = {
  register: (societyId: string, data: RegisterUserRequest) =>
    api.post<User>(`/societies/${societyId}/users`, data).then((r) => r.data),

  update: (societyId: string, id: string, data: { fullName: string; phone: string }) =>
    api.put<User>(`/societies/${societyId}/users/${id}`, data).then((r) => r.data),

  activate: (societyId: string, id: string) =>
    api.post<void>(`/societies/${societyId}/users/${id}/activate`).then((r) => r.data),

  deactivate: (societyId: string, id: string) =>
    api.post<void>(`/societies/${societyId}/users/${id}/deactivate`).then((r) => r.data),

  sendOtp: (societyId: string, id: string) =>
    api.post<void>(`/societies/${societyId}/users/${id}/send-otp`).then((r) => r.data),

  addApartment: (societyId: string, userId: string, data: { apartmentId: string; residentType: 'Owner' | 'Tenant' }) =>
    api.post<User>(`/societies/${societyId}/users/${userId}/apartments`, data).then((r) => r.data),

  removeApartment: (societyId: string, userId: string, apartmentId: string) =>
    api.delete<User>(`/societies/${societyId}/users/${userId}/apartments/${apartmentId}`).then((r) => r.data),

  addHouseholdMember: (
    societyId: string,
    apartmentId: string,
    data: { fullName: string; email: string; phone: string; residentType: 'FamilyMember' | 'CoOccupant' }
  ) =>
    api.post<User>(`/societies/${societyId}/apartments/${apartmentId}/household-members`, data).then((r) => r.data),

  transferOwnership: (societyId: string, apartmentId: string, data: TransferResidentRequest) =>
    api.post<User>(`/societies/${societyId}/apartments/${apartmentId}/ownership-transfer`, data).then((r) => r.data),

  transferTenancy: (societyId: string, apartmentId: string, data: TransferResidentRequest) =>
    api.post<User>(`/societies/${societyId}/apartments/${apartmentId}/tenancy-transfer`, data).then((r) => r.data),

  generateInviteLink: (societyId: string, apartmentId?: string) =>
    api.post<InviteLink>(`/societies/${societyId}/invite-link`, { apartmentId }).then((r) => r.data),

  shareInviteLink: (societyId: string, email: string, apartmentId?: string) =>
    api.post<void>(`/societies/${societyId}/invite-link/share`, { apartmentId, email }).then((r) => r.data),

  requestApartmentJoin: (societyId: string, userId: string, data: { apartmentId: string; residentType: 'Owner' | 'Tenant' }) =>
    api.post<User>(`/societies/${societyId}/users/${userId}/apartment-join-request`, data).then((r) => r.data),

  approveApartmentJoin: (societyId: string, userId: string) =>
    api.post<User>(`/societies/${societyId}/users/${userId}/apartment-join-request/approve`).then((r) => r.data),

  denyApartmentJoin: (societyId: string, userId: string) =>
    api.post<User>(`/societies/${societyId}/users/${userId}/apartment-join-request/deny`).then((r) => r.data),

  getPendingJoinRequests: (societyId: string) =>
    api.get<User[]>(`/societies/${societyId}/users/pending-join-requests`).then((r) => r.data),
};
