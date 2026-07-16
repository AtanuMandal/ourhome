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

  // Unfiltered landing view in one call: all Pending + CheckedIn plus the N most recent concluded entries.
  getDefaultView: (societyId: string, recentCount: number) =>
    api
      .get<Visitor[]>(`/societies/${societyId}/visitors/default-view`, { params: { recentCount } })
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

  // Pass verification doubles as check-in: the backend validates the pass and checks the
  // visitor in as one step (idempotent when the visitor is already checked in).
  checkInVisitorByPass: (societyId: string, passCode: string) =>
    api
      .post<Visitor>(`/societies/${societyId}/visitors/checkin`, { passCode })
      .then((r) => r.data),

  // Email/SMS the pass link to the visitor (backend sends via ACS).
  sharePass: (societyId: string, visitorId: string, data: { email?: string; phone?: string }) =>
    api.post<boolean>(`/societies/${societyId}/visitors/${visitorId}/share`, data).then((r) => r.data),

  // Visitor log as CSV text — shared via the native share sheet on mobile.
  exportCsv: (societyId: string, params?: Record<string, string | number>) =>
    api
      .get<string>(`/societies/${societyId}/visitors/export`, {
        params,
        responseType: 'text',
        transformResponse: [(data: string) => data],
      })
      .then((r) => r.data),

  getLookups: (societyId: string) =>
    api
      .get<{ companies: string[]; purposes: string[] }>(`/societies/${societyId}/visitors/lookups`)
      .then((r) => r.data),
};
