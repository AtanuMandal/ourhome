import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { AgmSessionDetail, AgmSessionSummary, CreateAgmSessionDto } from '../models/poll.model';

@Injectable({ providedIn: 'root' })
export class AgmSessionService {
  private readonly api = inject(ApiService);

  create(societyId: string, dto: CreateAgmSessionDto) {
    return this.api.post<AgmSessionSummary>(`societies/${societyId}/agm-sessions`, dto);
  }

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<AgmSessionSummary>(`societies/${societyId}/agm-sessions`, page, pageSize);
  }

  get(societyId: string, id: string) {
    return this.api.get<AgmSessionDetail>(`societies/${societyId}/agm-sessions/${id}`);
  }
}
