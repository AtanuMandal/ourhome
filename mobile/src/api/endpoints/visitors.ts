import api from '../client';
import type { Visitor, PaginatedResponse } from '../types';

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

  registerVisitor: (societyId: string, data: Partial<Visitor>) =>
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
};
