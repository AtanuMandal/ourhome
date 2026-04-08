import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Complaint, RaiseComplaintDto, ResolveComplaintDto } from '../models/complaint.model';

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private readonly api = inject(ApiService);

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Complaint>(`societies/${societyId}/complaints`, page, pageSize);
  }

  get(societyId: string, id: string) {
    return this.api.get<Complaint>(`societies/${societyId}/complaints/${id}`);
  }

  raise(societyId: string, dto: RaiseComplaintDto) {
    return this.api.post<Complaint>(`societies/${societyId}/complaints`, dto);
  }

  resolve(societyId: string, id: string, dto: ResolveComplaintDto) {
    return this.api.post<Complaint>(`societies/${societyId}/complaints/${id}/resolve`, dto);
  }
}
