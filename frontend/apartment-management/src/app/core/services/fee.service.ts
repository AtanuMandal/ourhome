import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { FeeSchedule, Payment, CreateFeeScheduleDto, MarkPaymentPaidDto } from '../models/fee.model';

@Injectable({ providedIn: 'root' })
export class FeeService {
  private readonly api = inject(ApiService);

  listSchedules(societyId: string) {
    return this.api.get<FeeSchedule[]>(`societies/${societyId}/fee-schedules`);
  }

  createSchedule(societyId: string, dto: CreateFeeScheduleDto) {
    return this.api.post<FeeSchedule>(`societies/${societyId}/fee-schedules`, dto);
  }

  getPaymentHistory(societyId: string, apartmentId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Payment>(
      `societies/${societyId}/apartments/${apartmentId}/payments`,
      page,
      pageSize
    );
  }

  markPaid(societyId: string, paymentId: string, dto: MarkPaymentPaidDto) {
    return this.api.post<Payment>(`societies/${societyId}/payments/${paymentId}/mark-paid`, dto);
  }
}
