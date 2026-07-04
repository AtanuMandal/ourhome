import api from '../client';
import type { Complaint, PaginatedResponse } from '../types';

export interface ResolveComplaintRequest {
  status: 'InProgress' | 'Resolved' | 'Closed' | 'Rejected';
  assignedToUserId?: string;
  notes?: string;
}

export const complaintsApi = {
  getComplaints: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<Complaint>>(`/societies/${societyId}/complaints`, { params })
      .then((r) => r.data),

  getComplaint: (societyId: string, id: string) =>
    api
      .get<Complaint>(`/societies/${societyId}/complaints/${id}`)
      .then((r) => r.data),

  createComplaint: (societyId: string, data: Partial<Complaint>) =>
    api
      .post<Complaint>(`/societies/${societyId}/complaints`, data)
      .then((r) => r.data),

  // Backend: POST /complaints/{id}/resolve — body: UpdateComplaintStatusCommand { status, assignedToUserId?, notes? }
  resolveComplaint: (societyId: string, id: string, data: ResolveComplaintRequest) =>
    api
      .post<Complaint>(`/societies/${societyId}/complaints/${id}/resolve`, data)
      .then((r) => r.data),
};
