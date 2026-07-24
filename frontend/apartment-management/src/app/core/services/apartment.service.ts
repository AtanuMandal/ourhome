import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { catchError, of, throwError } from 'rxjs';
import {
  Apartment,
  ApartmentResidentHistoryResponse,
  BulkImportResult,
  ChangeApartmentStatusDto,
  CreateApartmentDto,
  ParkingCarNumber,
  UpdateApartmentDto
} from '../models/apartment.model';
import { User, InviteLink, InviteTokenValidation } from '../models/user.model';

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

  updateParking(societyId: string, id: string, carNumbers: ParkingCarNumber[]) {
    return this.api.put<Apartment>(`societies/${societyId}/apartments/${id}/parking`, { carNumbers });
  }

  exportDirectoryReport(societyId: string) {
    return this.api.download(`societies/${societyId}/apartments/directory-report`);
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  get(societyId: string, id: string) {
    return this.api.get<User>(`societies/${societyId}/users/${id}`);
  }

  findByEmail(societyId: string, email: string) {
    return this.api.get<User>(`societies/${societyId}/users/by-email`, { email }).pipe(
      catchError(error => error.status === 404 ? of(null) : throwError(() => error))
    );
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

  list(societyId: string, page = 1, pageSize = 20, search?: string) {
    return this.api.getPaged<User>(`societies/${societyId}/users`, page, pageSize, search ? { search } : undefined);
  }

  delete(societyId: string, id: string) {
    return this.api.delete<void>(`societies/${societyId}/users/${id}`);
  }

  addApartment(societyId: string, userId: string, dto: { apartmentId: string; residentType: 'Owner' | 'Tenant' }) {
    return this.api.post<User>(`societies/${societyId}/users/${userId}/apartments`, dto);
  }

  removeApartment(societyId: string, userId: string, apartmentId: string) {
    return this.api.delete<User>(`societies/${societyId}/users/${userId}/apartments/${apartmentId}`);
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

  update(societyId: string, id: string, dto: { fullName: string; phone: string }) {
    return this.api.put<User>(`societies/${societyId}/users/${id}`, dto);
  }

  uploadProfilePicture(societyId: string, id: string, file: Blob, fileName = 'profile.jpg') {
    const form = new FormData();
    form.append('file', file, fileName);
    return this.api.post<{ profilePictureUrl: string }>(`societies/${societyId}/users/${id}/profile-picture`, form);
  }

  deactivate(societyId: string, id: string) {
    return this.api.post<void>(`societies/${societyId}/users/${id}/deactivate`, {});
  }

  activate(societyId: string, id: string) {
    return this.api.post<void>(`societies/${societyId}/users/${id}/activate`, {});
  }

  sendOtp(societyId: string, id: string) {
    return this.api.post<void>(`societies/${societyId}/users/${id}/send-otp`, {});
  }

  changePassword(societyId: string, id: string, dto: { currentPassword: string; newPassword: string }) {
    return this.api.put<void>(`societies/${societyId}/users/${id}/password`, dto);
  }

  generateInviteLink(societyId: string, apartmentId?: string) {
    return this.api.post<InviteLink>(`societies/${societyId}/invite-link`, { apartmentId });
  }

  shareInviteLink(societyId: string, email: string, apartmentId?: string) {
    return this.api.post<void>(`societies/${societyId}/invite-link/share`, { apartmentId, email });
  }

  requestApartmentJoin(societyId: string, userId: string, dto: { apartmentId: string; residentType: 'Owner' | 'Tenant' }) {
    return this.api.post<User>(`societies/${societyId}/users/${userId}/apartment-join-request`, dto);
  }

  approveApartmentJoin(societyId: string, userId: string) {
    return this.api.post<User>(`societies/${societyId}/users/${userId}/apartment-join-request/approve`, {});
  }

  denyApartmentJoin(societyId: string, userId: string) {
    return this.api.post<User>(`societies/${societyId}/users/${userId}/apartment-join-request/deny`, {});
  }

  getPendingJoinRequests(societyId: string) {
    return this.api.get<User[]>(`societies/${societyId}/users/pending-join-requests`);
  }
}
