import api from '../client';
import type { Notice, PaginatedResponse } from '../types';

export interface CreateNoticeRequest {
  title: string;
  content: string;
  category: 'General' | 'Maintenance' | 'Event' | 'Emergency' | 'Financial' | 'Bylaw';
  publishAt?: string;
  expiresAt?: string;
}

export interface UpdateNoticeRequest {
  title: string;
  content: string;
  expiresAt?: string;
}

export interface NoticeReadReceiptEntry {
  userId: string;
  fullName: string;
}

export interface NoticeReadReceipts {
  read: NoticeReadReceiptEntry[];
  unread: NoticeReadReceiptEntry[];
}

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

  createNotice: (societyId: string, data: CreateNoticeRequest) =>
    api
      .post<Notice>(`/societies/${societyId}/notices`, data)
      .then((r) => r.data),

  updateNotice: (societyId: string, id: string, data: UpdateNoticeRequest) =>
    api
      .put<Notice>(`/societies/${societyId}/notices/${id}`, data)
      .then((r) => r.data),

  getReadReceipts: (societyId: string, id: string) =>
    api
      .get<NoticeReadReceipts>(`/societies/${societyId}/notices/${id}/read-receipts`)
      .then((r) => r.data),
};
