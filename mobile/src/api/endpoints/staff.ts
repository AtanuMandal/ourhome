import api from '../client';
import type {
  PaginatedResponse,
  Shift,
  Staff,
  StaffAttendance,
  StaffAttendanceReport,
  StaffCategory,
  StaffEmploymentType,
} from '../types';

export interface CreateStaffRequest {
  fullName: string;
  phone: string;
  category: StaffCategory;
  employmentType: StaffEmploymentType;
  photoUrl?: string;
  vendorId?: string;
  shiftId?: string;
}

export interface UpdateStaffRequest {
  fullName: string;
  phone: string;
  photoUrl?: string;
  shiftId?: string;
}

export interface CreateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export interface UpdateShiftRequest {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export const staffApi = {
  getStaff: (societyId: string, params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Staff>>(`/societies/${societyId}/staff`, { params }).then((r) => r.data),

  getStaffMember: (societyId: string, id: string) =>
    api.get<Staff>(`/societies/${societyId}/staff/${id}`).then((r) => r.data),

  createStaff: (societyId: string, data: CreateStaffRequest) =>
    api.post<Staff>(`/societies/${societyId}/staff`, data).then((r) => r.data),

  updateStaff: (societyId: string, id: string, data: UpdateStaffRequest) =>
    api.put<Staff>(`/societies/${societyId}/staff/${id}`, data).then((r) => r.data),

  deactivateStaff: (societyId: string, id: string) =>
    api.post<boolean>(`/societies/${societyId}/staff/${id}/deactivate`).then((r) => r.data),

  reactivateStaff: (societyId: string, id: string) =>
    api.post<boolean>(`/societies/${societyId}/staff/${id}/reactivate`).then((r) => r.data),

  deleteStaff: (societyId: string, id: string) =>
    api.delete<boolean>(`/societies/${societyId}/staff/${id}`).then((r) => r.data),

  checkIn: (societyId: string, id: string) =>
    api.post<StaffAttendance>(`/societies/${societyId}/staff/${id}/check-in`).then((r) => r.data),

  checkOut: (societyId: string, id: string) =>
    api.post<StaffAttendance>(`/societies/${societyId}/staff/${id}/check-out`).then((r) => r.data),

  getOnDuty: (societyId: string) =>
    api.get<StaffAttendance[]>(`/societies/${societyId}/staff/on-duty`).then((r) => r.data),

  getShifts: (societyId: string) =>
    api.get<Shift[]>(`/societies/${societyId}/shifts`).then((r) => r.data),

  createShift: (societyId: string, data: CreateShiftRequest) =>
    api.post<Shift>(`/societies/${societyId}/shifts`, data).then((r) => r.data),

  updateShift: (societyId: string, id: string, data: UpdateShiftRequest) =>
    api.put<Shift>(`/societies/${societyId}/shifts/${id}`, data).then((r) => r.data),

  deleteShift: (societyId: string, id: string) =>
    api.delete<boolean>(`/societies/${societyId}/shifts/${id}`).then((r) => r.data),

  getAttendanceReport: (societyId: string, fromDate: string, toDate: string, category?: string) =>
    api
      .get<StaffAttendanceReport>(`/societies/${societyId}/staff/attendance/report`, {
        params: { fromDate, toDate, ...(category ? { category } : {}) },
      })
      .then((r) => r.data),
};
