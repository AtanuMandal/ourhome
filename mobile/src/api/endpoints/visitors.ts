import api from '../client';
import type { Visitor, PaginatedResponse } from '../types';

// Matches backend RegisterVisitorRequest
export interface RegisterVisitorRequest {
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  purpose: string;
  apartmentId: string;
  companyName?: string;
  vehicleNumber?: string;
  isPreApproved?: boolean;
  validityHours?: number;
  visitorImageUrl?: string;
}

export const visitorsApi = {
  getVisitors: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<Visitor>>(`/societies/${societyId}/visitors`, { params })
      .then((r) => r.data),

  getVisitor: (societyId: string, id: string) =>
    api
      .get<Visitor>(`/societies/${societyId}/visitors/${id}`)
      .then((r) => r.data),

  registerVisitor: (societyId: string, data: RegisterVisitorRequest) =>
    api
      .post<Visitor>(`/societies/${societyId}/visitors`, data)
      .then((r) => r.data),

  approveVisitor: (societyId: string, id: string) =>
    api
      .post<Visitor>(`/societies/${societyId}/visitors/${id}/approve`)
      .then((r) => r.data),

  denyVisitor: (societyId: string, id: string) =>
    api
      .post<Visitor>(`/societies/${societyId}/visitors/${id}/deny`)
      .then((r) => r.data),

  checkOutVisitor: (societyId: string, id: string) =>
    api
      .post<Visitor>(`/societies/${societyId}/visitors/${id}/checkout`)
      .then((r) => r.data),

  getLookups: (societyId: string) =>
    api
      .get<{ companies: string[]; purposes: string[] }>(`/societies/${societyId}/visitors/lookups`)
      .then((r) => r.data),
};
