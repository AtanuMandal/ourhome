import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeeSchedule, FeePayment } from '../models/fee.model';

@Injectable({ providedIn: 'root' })
export class FeeService {
  private readonly http = inject(HttpClient);

  listSchedules(societyId: string): Observable<FeeSchedule[]> {
    return this.http.get<FeeSchedule[]>(`/api/${societyId}/fees/schedules`);
  }

  createSchedule(societyId: string, body: Partial<FeeSchedule>) {
    return this.http.post<FeeSchedule>(`/api/${societyId}/fees/schedules`, body);
  }

  updateSchedule(societyId: string, scheduleId: string, body: Partial<FeeSchedule>) {
    return this.http.put<FeeSchedule>(`/api/${societyId}/fees/schedules/${scheduleId}`, body);
  }

  listPayments(societyId: string, apartmentId: string, page = 1, pageSize = 20) {
    return this.http.get<{ items: FeePayment[] }>(`/api/${societyId}/fees/history?apartmentId=${apartmentId}&page=${page}&pageSize=${pageSize}`);
  }

  recordPayment(societyId: string, paymentId: string, body: { paymentMethod: string; transactionId: string; receiptUrl?: string; }) {
    return this.http.post<FeePayment>(`/api/${societyId}/fees/payments/${paymentId}/record`, body);
  }

  uploadPaymentProof(societyId: string, paymentId: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`/api/${societyId}/fees/payments/${paymentId}/upload`, fd);
  }
}
