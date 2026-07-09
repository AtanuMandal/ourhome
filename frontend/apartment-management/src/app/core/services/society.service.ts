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
}
