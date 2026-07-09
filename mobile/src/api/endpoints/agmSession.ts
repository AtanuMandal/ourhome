import api from '../client';
import type { AgmSessionDetail, AgmSessionSummary, PaginatedResponse } from '../types';

export interface CreateAgmSessionRequest {
  title: string;
  description: string;
  sessionDate: string;
}

export const agmSessionApi = {
  create: (societyId: string, data: CreateAgmSessionRequest) =>
    api.post<AgmSessionSummary>(`/societies/${societyId}/agm-sessions`, data).then((r) => r.data),

  getSessions: (societyId: string, params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<AgmSessionSummary>>(`/societies/${societyId}/agm-sessions`, { params }).then((r) => r.data),

  getSession: (societyId: string, id: string) =>
    api.get<AgmSessionDetail>(`/societies/${societyId}/agm-sessions/${id}`).then((r) => r.data),
};
