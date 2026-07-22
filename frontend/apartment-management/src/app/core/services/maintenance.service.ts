import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
    ApproveMaintenancePaymentProofGroupDto,
    CreateMaintenancePenaltyChargeDto,
    CreateMaintenanceScheduleDto,
    DeleteMaintenanceScheduleDto,
    DenyMaintenancePaymentProofDto,
    DenyMaintenancePaymentProofGroupDto,
    MaintenanceChargeGrid,
    MaintenanceCharge,
    MaintenanceChargeFilters,
    MaintenanceGridFilters,
    MaintenanceProofUploadResponse,
    MaintenanceSchedule,
    MarkMaintenanceChargePaidDto,
    SubmitMaintenancePaymentProofDto,
  UpdateMaintenanceScheduleDto,
} from '../models/maintenance.model';

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly api = inject(ApiService);

  listSchedules(societyId: string, apartmentId?: string) {
    return this.api.get<MaintenanceSchedule[]>(
      `societies/${societyId}/maintenance/schedules`,
      apartmentId ? { apartmentId } : undefined
    );
  }

  createSchedule(societyId: string, dto: CreateMaintenanceScheduleDto) {
    return this.api.post<MaintenanceSchedule>(`societies/${societyId}/maintenance/schedules`, dto);
  }

  updateSchedule(societyId: string, scheduleId: string, dto: UpdateMaintenanceScheduleDto) {
    return this.api.put<MaintenanceSchedule>(`societies/${societyId}/maintenance/schedules/${scheduleId}`, dto);
  }

  deleteSchedule(societyId: string, scheduleId: string, dto: DeleteMaintenanceScheduleDto) {
    return this.api.deleteWithBody<boolean>(`societies/${societyId}/maintenance/schedules/${scheduleId}`, dto);
  }

  /**
   * Pass `updatedSince` (ISO-8601 UTC) for auto-refresh/delta mode — see
   * requirements/auto_refresh.md — which returns only charges changed since then (server-side
   * capped to 10 minutes) instead of the full paged result.
   */
  listCharges(societyId: string, filters: MaintenanceChargeFilters = {}, updatedSince?: string) {
    const query = this.toQuery(filters);
    if (updatedSince) query['updatedSince'] = updatedSince;
    return this.api.getPaged<MaintenanceCharge>(
      `societies/${societyId}/maintenance/charges`,
      filters.page ?? 1,
      filters.pageSize ?? 100,
      query
    );
  }

  getApartmentHistory(societyId: string, apartmentId: string, filters: MaintenanceChargeFilters = {}, updatedSince?: string) {
    const query = this.toQuery(filters);
    if (updatedSince) query['updatedSince'] = updatedSince;
    return this.api.getPaged<MaintenanceCharge>(
      `societies/${societyId}/apartments/${apartmentId}/maintenance/charges`,
      filters.page ?? 1,
      filters.pageSize ?? 100,
      query
    );
  }

  submitProof(societyId: string, dto: SubmitMaintenancePaymentProofDto) {
    return this.api.post<boolean>(`societies/${societyId}/maintenance/payments/proof`, dto);
  }

  uploadProof(societyId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postForm<MaintenanceProofUploadResponse>(`societies/${societyId}/maintenance/payments/proof/upload`, formData);
  }

  approveProof(societyId: string, chargeId: string, dto: MarkMaintenanceChargePaidDto) {
    return this.api.post<boolean>(`societies/${societyId}/maintenance/charges/${chargeId}/approve`, dto);
  }

  markPaid(societyId: string, chargeId: string, dto: MarkMaintenanceChargePaidDto) {
    return this.api.post<boolean>(`societies/${societyId}/maintenance/charges/${chargeId}/mark-paid`, dto);
  }

  denyProof(societyId: string, chargeId: string, dto: DenyMaintenancePaymentProofDto) {
    return this.api.post<MaintenanceCharge>(`societies/${societyId}/maintenance/charges/${chargeId}/deny`, dto);
  }

  approveProofGroup(societyId: string, dto: ApproveMaintenancePaymentProofGroupDto) {
    return this.api.post<MaintenanceCharge[]>(`societies/${societyId}/maintenance/charges/group/approve`, dto);
  }

  denyProofGroup(societyId: string, dto: DenyMaintenancePaymentProofGroupDto) {
    return this.api.post<MaintenanceCharge[]>(`societies/${societyId}/maintenance/charges/group/deny`, dto);
  }

  getChargeGrid(societyId: string, filters: MaintenanceGridFilters) {
    const query = this.toGridQuery(filters);
    return this.api.get<MaintenanceChargeGrid>(`societies/${societyId}/maintenance/grid`, query);
  }

  createPenaltyCharge(societyId: string, dto: CreateMaintenancePenaltyChargeDto) {
    return this.api.post<MaintenanceCharge>(`societies/${societyId}/maintenance/charges/penalty`, dto);
  }

  private toQuery(filters: MaintenanceChargeFilters): Record<string, string | number> {
    return Object.fromEntries(
      Object.entries({
        apartmentId: filters.apartmentId,
        year: filters.year,
        month: filters.month,
        status: filters.status,
      }).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Record<string, string | number>;
  }

  private toGridQuery(filters: MaintenanceGridFilters): Record<string, string | number> {
    return Object.fromEntries(
      Object.entries({
        financialYearStart: filters.financialYearStart,
        apartmentId: filters.apartmentId,
        block: filters.block,
        floor: filters.floor,
        status: filters.status,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      }).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Record<string, string | number>;
  }
}
