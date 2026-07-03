import api from '../client';
import type { Complaint, PaginatedResponse } from '../types';

export const complaintsApi = {
  getComplaints: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<Complaint>>(`/societies/${societyId}/complaints`, { params })
      .then((r) => r.data),

  createComplaint: (societyId: string, data: Partial<Complaint>) =>
    api
      .post<Complaint>(`/societies/${societyId}/complaints`, data)
      .then((r) => r.data),

  updateComplaintStatus: (societyId: string, id: string, status: string) =>
    api
      .patch<Complaint>(`/societies/${societyId}/complaints/${id}/status`, { status })
      .then((r) => r.data),
};
