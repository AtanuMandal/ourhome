import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { Visitor, RegisterVisitorDto, VisitorListFilters, VisitorImageUploadResponse, PublicVisitorPass, ShareVisitorPassRequest } from '../models/visitor.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  list(societyId: string, page = 1, pageSize = 20, filters: VisitorListFilters = {}, updatedSince?: string) {
    const extra: Record<string, string | number> = { ...filters as Record<string, string | number> };
    if (updatedSince) extra['updatedSince'] = updatedSince;
    return this.api.getPaged<Visitor>(`societies/${societyId}/visitors`, page, pageSize, extra);
  }

  /**
   * Unfiltered landing view in one call: all Pending + CheckedIn plus the N most recent
   * concluded entries. Pass `updatedSince` (ISO-8601 UTC) for auto-refresh/delta mode — see
   * requirements/auto_refresh.md — which returns only records changed since then (server-side
   * capped to 10 minutes) instead of the full landing view.
   */
  defaultView(societyId: string, recentCount: number, updatedSince?: string) {
    const params: Record<string, string | number> = { recentCount };
    if (updatedSince) params['updatedSince'] = updatedSince;
    return this.api.get<Visitor[]>(`societies/${societyId}/visitors/default-view`, params);
  }

  get(societyId: string, id: string) {
    return this.api.get<Visitor>(`societies/${societyId}/visitors/${id}`);
  }

  register(societyId: string, dto: RegisterVisitorDto) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors`, dto);
  }

  approve(societyId: string, id: string) {
    return this.api.post<boolean>(`societies/${societyId}/visitors/${id}/approve`, {});
  }

  deny(societyId: string, id: string) {
    return this.api.post<boolean>(`societies/${societyId}/visitors/${id}/deny`, {});
  }

  verify(societyId: string, passCode: string) {
    return this.api.get<Visitor>(`societies/${societyId}/visitors/verify`, { passCode });
  }

  checkin(societyId: string, passCode: string) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors/checkin`, { passCode });
  }

  checkout(societyId: string, id: string) {
    return this.api.post<boolean>(`societies/${societyId}/visitors/${id}/checkout`, {});
  }

  export(societyId: string, filters: VisitorListFilters = {}) {
    return this.api.download(`societies/${societyId}/visitors/export`, filters as Record<string, string | number>);
  }

  uploadImage(societyId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postForm<VisitorImageUploadResponse>(`societies/${societyId}/visitors/images/upload`, formData);
  }

  getPublicPass(passCode: string) {
    return this.http.get<PublicVisitorPass>(`${environment.apiBaseUrl}/visitors/pass/${encodeURIComponent(passCode)}`);
  }

  sharePass(societyId: string, visitorId: string, request: ShareVisitorPassRequest) {
    return this.api.post<boolean>(`societies/${societyId}/visitors/${visitorId}/share`, request);
  }

  getLookups(societyId: string) {
    return this.api.get<{ companies: string[]; purposes: string[] }>(`societies/${societyId}/visitors/lookups`);
  }
}
