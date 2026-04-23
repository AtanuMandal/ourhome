import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  CreateVendorDto,
  CreateVendorOneTimeChargeDto,
  CreateVendorRecurringScheduleDto,
  MarkVendorChargePaidDto,
  UpdateVendorDto,
  UpdateVendorRecurringScheduleDto,
  VendorCharge,
  VendorChargeFilters,
  VendorChargeGrid,
  VendorDocumentUploadResponse,
  VendorPaymentVendor,
  VendorRecurringSchedule,
} from '../models/vendor-payment.model';

@Injectable({ providedIn: 'root' })
export class VendorPaymentService {
  private readonly api = inject(ApiService);

  listVendors(societyId: string, search?: string) {
    return this.api.get<VendorPaymentVendor[]>(
      `societies/${societyId}/vendor-payments/vendors`,
      search ? { search } : undefined
    );
  }

  createVendor(societyId: string, dto: CreateVendorDto) {
    return this.api.post<VendorPaymentVendor>(`societies/${societyId}/vendor-payments/vendors`, dto);
  }

  updateVendor(societyId: string, vendorId: string, dto: UpdateVendorDto) {
    return this.api.put<VendorPaymentVendor>(`societies/${societyId}/vendor-payments/vendors/${vendorId}`, dto);
  }

  uploadDocument(societyId: string, documentType: 'picture' | 'contract' | 'receipt', file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.api.postForm<VendorDocumentUploadResponse>(
      `societies/${societyId}/vendor-payments/uploads/${documentType}`,
      formData
    );
  }

  listSchedules(societyId: string, vendorId: string) {
    return this.api.get<VendorRecurringSchedule[]>(
      `societies/${societyId}/vendor-payments/schedules`,
      { vendorId }
    );
  }

  createSchedule(societyId: string, dto: CreateVendorRecurringScheduleDto) {
    return this.api.post<VendorRecurringSchedule>(`societies/${societyId}/vendor-payments/schedules`, dto);
  }

  updateSchedule(societyId: string, scheduleId: string, dto: UpdateVendorRecurringScheduleDto) {
    return this.api.put<VendorRecurringSchedule>(`societies/${societyId}/vendor-payments/schedules/${scheduleId}`, dto);
  }

  createOneTimeCharge(societyId: string, dto: CreateVendorOneTimeChargeDto) {
    return this.api.post<VendorCharge>(`societies/${societyId}/vendor-payments/charges/one-time`, dto);
  }

  listCharges(societyId: string, filters: VendorChargeFilters = {}) {
    return this.api.getPaged<VendorCharge>(
      `societies/${societyId}/vendor-payments/charges`,
      filters.page ?? 1,
      filters.pageSize ?? 100,
      this.toQuery(filters)
    );
  }

  getChargeGrid(societyId: string, year: number) {
    return this.api.get<VendorChargeGrid>(`societies/${societyId}/vendor-payments/grid`, { year });
  }

  markPaid(societyId: string, chargeId: string, dto: MarkVendorChargePaidDto) {
    return this.api.post<VendorCharge>(`societies/${societyId}/vendor-payments/charges/${chargeId}/mark-paid`, dto);
  }

  inactivateCharge(societyId: string, chargeId: string) {
    return this.api.post<VendorCharge>(`societies/${societyId}/vendor-payments/charges/${chargeId}/inactivate`, {});
  }

  activateCharge(societyId: string, chargeId: string) {
    return this.api.post<VendorCharge>(`societies/${societyId}/vendor-payments/charges/${chargeId}/activate`, {});
  }

  deleteCharge(societyId: string, chargeId: string) {
    return this.api.delete<boolean>(`societies/${societyId}/vendor-payments/charges/${chargeId}`);
  }

  private toQuery(filters: VendorChargeFilters): Record<string, string | number> {
    return Object.fromEntries(
      Object.entries({
        vendorId: filters.vendorId,
        year: filters.year,
        month: filters.month,
        status: filters.status,
      }).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Record<string, string | number>;
  }
}
