import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Visitor, RegisterVisitorDto, VisitorSearchFilters } from '../models/visitor.model';

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly api = inject(ApiService);

  list(societyId: string, filters: VisitorSearchFilters, page = 1, pageSize = 20) {
    return this.api.getPaged<Visitor>(`societies/${societyId}/visitors`, page, pageSize, this.toQuery(filters));
  }

  listMine(societyId: string, filters: VisitorSearchFilters, page = 1, pageSize = 20) {
    return this.api.getPaged<Visitor>(`societies/${societyId}/visitors/my`, page, pageSize, this.toQuery(filters));
  }

  listPendingApprovals(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Visitor>(`societies/${societyId}/visitors/pending-approvals`, page, pageSize);
  }

  get(societyId: string, id: string) {
    return this.api.get<Visitor>(`societies/${societyId}/visitors/${id}`);
  }

  register(societyId: string, dto: RegisterVisitorDto) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors`, dto);
  }

  approve(societyId: string, id: string) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors/${id}/approve`, {});
  }

  deny(societyId: string, id: string) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors/${id}/deny`, {});
  }

  checkin(societyId: string, id: string, passCode?: string) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors/${id}/checkin`, { passCode });
  }

  checkout(societyId: string, id: string) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors/${id}/checkout`, {});
  }

  private toQuery(filters: VisitorSearchFilters): Record<string, string> {
    const query: Record<string, string> = {};
    if (filters.fromDate) query['fromDate'] = filters.fromDate;
    if (filters.toDate) query['toDate'] = filters.toDate;
    if (filters.apartmentId) query['apartmentId'] = filters.apartmentId;
    if (filters.visitorName) query['visitorName'] = filters.visitorName;
    if (filters.status) query['status'] = filters.status;
    return query;
  }
}
