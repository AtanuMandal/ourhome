import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  CreateMaintenancePenaltyChargeDto,
  CreateMaintenanceScheduleDto,
  DeleteMaintenanceScheduleDto,
  MaintenanceChargeGrid,
  MaintenanceCharge,
  MaintenanceChargeFilters,
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

  listCharges(societyId: string, filters: MaintenanceChargeFilters = {}) {
    return this.api.getPaged<MaintenanceCharge>(
      `societies/${societyId}/maintenance/charges`,
      filters.page ?? 1,
      filters.pageSize ?? 100,
      this.toQuery(filters)
    );
  }

  getApartmentHistory(societyId: string, apartmentId: string, filters: MaintenanceChargeFilters = {}) {
    return this.api.getPaged<MaintenanceCharge>(
      `societies/${societyId}/apartments/${apartmentId}/maintenance/charges`,
      filters.page ?? 1,
      filters.pageSize ?? 100,
      this.toQuery(filters)
    );
  }

  submitProof(societyId: string, dto: SubmitMaintenancePaymentProofDto) {
    return this.api.post<boolean>(`societies/${societyId}/maintenance/payments/proof`, dto);
  }

  approveProof(societyId: string, chargeId: string, dto: MarkMaintenanceChargePaidDto) {
    return this.api.post<boolean>(`societies/${societyId}/maintenance/charges/${chargeId}/approve`, dto);
  }

  markPaid(societyId: string, chargeId: string, dto: MarkMaintenanceChargePaidDto) {
    return this.api.post<boolean>(`societies/${societyId}/maintenance/charges/${chargeId}/mark-paid`, dto);
  }

  getChargeGrid(societyId: string, year: number) {
    return this.api.get<MaintenanceChargeGrid>(`societies/${societyId}/maintenance/grid`, { year });
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
}
