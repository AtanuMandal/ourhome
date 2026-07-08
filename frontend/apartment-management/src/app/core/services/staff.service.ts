import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  CreateShiftDto,
  CreateStaffDto,
  Shift,
  Staff,
  StaffAttendance,
  StaffAttendanceReport,
  UpdateStaffDto,
} from '../models/staff.model';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly api = inject(ApiService);

  list(societyId: string) {
    return this.api.get<Shift[]>(`societies/${societyId}/shifts`);
  }

  create(societyId: string, dto: CreateShiftDto) {
    return this.api.post<Shift>(`societies/${societyId}/shifts`, dto);
  }
}

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly api = inject(ApiService);

  list(societyId: string, page = 1, pageSize = 100, filters: { category?: string; activeOnly?: boolean } = {}) {
    return this.api.getPaged<Staff>(`societies/${societyId}/staff`, page, pageSize, {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.activeOnly !== undefined ? { activeOnly: String(filters.activeOnly) } : {}),
    });
  }

  get(societyId: string, id: string) {
    return this.api.get<Staff>(`societies/${societyId}/staff/${id}`);
  }

  create(societyId: string, dto: CreateStaffDto) {
    return this.api.post<Staff>(`societies/${societyId}/staff`, dto);
  }

  update(societyId: string, id: string, dto: UpdateStaffDto) {
    return this.api.put<Staff>(`societies/${societyId}/staff/${id}`, dto);
  }

  deactivate(societyId: string, id: string) {
    return this.api.post<boolean>(`societies/${societyId}/staff/${id}/deactivate`, {});
  }

  checkIn(societyId: string, id: string) {
    return this.api.post<StaffAttendance>(`societies/${societyId}/staff/${id}/check-in`, {});
  }

  checkOut(societyId: string, id: string) {
    return this.api.post<StaffAttendance>(`societies/${societyId}/staff/${id}/check-out`, {});
  }

  onDuty(societyId: string) {
    return this.api.get<StaffAttendance[]>(`societies/${societyId}/staff/on-duty`);
  }

  attendanceHistory(societyId: string, staffId: string, page = 1, pageSize = 20, fromDate?: string, toDate?: string) {
    return this.api.getPaged<StaffAttendance>(`societies/${societyId}/staff/${staffId}/attendance`, page, pageSize, {
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    });
  }

  attendanceReport(societyId: string, fromDate: string, toDate: string, category?: string) {
    return this.api.get<StaffAttendanceReport>(`societies/${societyId}/staff/attendance/report`, {
      fromDate, toDate, ...(category ? { category } : {}),
    });
  }
}
