import api from '../client';
import type { Notice, PaginatedResponse } from '../types';

export const noticesApi = {
  getNotices: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<Notice>>(`/societies/${societyId}/notices`, { params })
      .then((r) => r.data),

  getNotice: (societyId: string, id: string) =>
    api
      .get<Notice>(`/societies/${societyId}/notices/${id}`)
      .then((r) => r.data),

  // Backend: PATCH /notices/{id}/read — body: MarkNoticeReadRequest { isRead: bool }
  markNoticeRead: (societyId: string, id: string) =>
    api
      .patch(`/societies/${societyId}/notices/${id}/read`, { isRead: true })
      .then((r) => r.data),
};
