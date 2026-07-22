import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Society, CreateSocietyDto, CreateSocietyResponse, UpdateSocietyDto, SocietySummaryReport } from '../models/society.model';
import { PagedResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class SocietyService {
  private readonly api  = inject(ApiService);
  private readonly auth = inject(AuthService);

  list(page = 1, pageSize = 20) {
    return this.api.getPaged<Society>('societies', page, pageSize);
  }

  get(id: string) {
    return this.api.get<Society>(`societies/${id}`);
  }

  create(dto: CreateSocietyDto) {
    return this.api.post<CreateSocietyResponse>('societies', dto);
  }

  update(id: string, dto: UpdateSocietyDto) {
    return this.api.put<Society>(`societies/${id}`, dto);
  }

  activate(id: string) {
    return this.api.post<boolean>(`societies/${id}/activate`, {});
  }

  deactivate(id: string) {
    return this.api.post<boolean>(`societies/${id}/deactivate`, {});
  }

  getSummaryReport(id: string) {
    return this.api.get<SocietySummaryReport>(`societies/${id}/report`);
  }

  uploadLogo(societyId: string, file: Blob, fileName = 'logo.png') {
    const form = new FormData();
    form.append('file', file, fileName);
    return this.api.post<{ logoUrl: string }>(`societies/${societyId}/logo`, form);
  }

  uploadBackgroundImage(societyId: string, file: Blob, fileName = 'background.jpg') {
    const form = new FormData();
    form.append('file', file, fileName);
    return this.api.post<{ sidenavBackgroundUrl: string }>(`societies/${societyId}/background-image`, form);
  }

  removeLogo(societyId: string) {
    return this.api.delete<Society>(`societies/${societyId}/logo`);
  }

  removeBackgroundImage(societyId: string) {
    return this.api.delete<Society>(`societies/${societyId}/background-image`);
  }
}
