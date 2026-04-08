import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Notice, PostNoticeDto } from '../models/notice.model';

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
}
