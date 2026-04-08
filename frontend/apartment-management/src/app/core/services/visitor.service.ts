import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Visitor, RegisterVisitorDto } from '../models/visitor.model';

@Injectable({ providedIn: 'root' })
export class VisitorService {
  private readonly api = inject(ApiService);

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Visitor>(`societies/${societyId}/visitors`, page, pageSize);
  }

  register(societyId: string, dto: RegisterVisitorDto) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors`, dto);
  }

  checkout(societyId: string, id: string) {
    return this.api.post<Visitor>(`societies/${societyId}/visitors/${id}/checkout`, {});
  }
}
