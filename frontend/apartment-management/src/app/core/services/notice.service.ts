import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Notice, NoticeReadReceipts, PostNoticeDto, UpdateNoticeDto } from '../models/notice.model';

@Injectable({ providedIn: 'root' })
export class NoticeService {
  private readonly api = inject(ApiService);

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Notice>(`societies/${societyId}/notices`, page, pageSize);
  }

  get(societyId: string, id: string) {
    return this.api.get<Notice>(`societies/${societyId}/notices/${id}`);
  }

  post(societyId: string, dto: PostNoticeDto) {
    return this.api.post<Notice>(`societies/${societyId}/notices`, dto);
  }

  update(societyId: string, id: string, dto: UpdateNoticeDto) {
    return this.api.put<Notice>(`societies/${societyId}/notices/${id}`, dto);
  }

  /** One-way: once a notice is marked read it can never be marked unread again. */
  markRead(societyId: string, id: string) {
    return this.api.patch<boolean>(`societies/${societyId}/notices/${id}/read`, {});
  }

  getReadReceipts(societyId: string, id: string) {
    return this.api.get<NoticeReadReceipts>(`societies/${societyId}/notices/${id}/read-receipts`);
  }
}
