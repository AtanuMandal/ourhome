import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  Apartment,
  ApartmentResidentHistoryResponse,
  BulkImportResult,
  ChangeApartmentStatusDto,
  CreateApartmentDto,
  UpdateApartmentDto
} from '../models/apartment.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApartmentService {
  private readonly api = inject(ApiService);

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Apartment>(`societies/${societyId}/apartments`, page, pageSize);
  }

  get(societyId: string, id: string) {
    return this.api.get<Apartment>(`societies/${societyId}/apartments/${id}`);
  }

  getResidentHistory(societyId: string, id: string) {
    return this.api.get<ApartmentResidentHistoryResponse>(`societies/${societyId}/apartments/${id}/resident-history`);
  }

  create(societyId: string, dto: CreateApartmentDto) {
    return this.api.post<Apartment>(`societies/${societyId}/apartments`, dto);
  }

  update(societyId: string, id: string, dto: UpdateApartmentDto) {
    return this.api.put<Apartment>(`societies/${societyId}/apartments/${id}`, dto);
  }

  delete(societyId: string, id: string) {
    return this.api.delete<boolean>(`societies/${societyId}/apartments/${id}`);
  }

  changeStatus(societyId: string, id: string, dto: ChangeApartmentStatusDto) {
    return this.api.put<boolean>(`societies/${societyId}/apartments/${id}/status`, dto);
  }

  uploadCsv(societyId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postForm<BulkImportResult>(`societies/${societyId}/apartments/import-csv`, formData);
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  get(societyId: string, id: string) {
    return this.api.get<User>(`societies/${societyId}/users/${id}`);
  }

  register(societyId: string, dto: {
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    residentType: string;
    apartmentId?: string;
    invitedByUserId?: string;
  }) {
    return this.api.post<User>(`societies/${societyId}/users`, dto);
  }

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<User>(`societies/${societyId}/users`, page, pageSize);
  }

  transferOwnership(societyId: string, apartmentId: string, dto: { fullName: string; email: string; phone: string }) {
    return this.api.post<User>(`societies/${societyId}/apartments/${apartmentId}/ownership-transfer`, dto);
  }

  transferTenancy(societyId: string, apartmentId: string, dto: { fullName: string; email: string; phone: string }) {
    return this.api.post<User>(`societies/${societyId}/apartments/${apartmentId}/tenancy-transfer`, dto);
  }

  addHouseholdMember(societyId: string, apartmentId: string, dto: {
    fullName: string;
    email: string;
    phone: string;
    residentType: 'FamilyMember' | 'CoOccupant';
  }) {
    return this.api.post<User>(`societies/${societyId}/apartments/${apartmentId}/household-members`, dto);
  }
}
