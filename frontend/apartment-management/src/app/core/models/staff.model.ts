export type StaffCategory = 'Security' | 'Housekeeping' | 'Gardener' | 'Plumber' | 'Electrician' | 'Other';
export type StaffEmploymentType = 'OnPayroll' | 'Contractor';
export type StaffAttendanceStatus = 'CheckedIn' | 'CheckedOut' | 'Absent' | 'OnLeave';

export interface Shift {
  id: string;
  societyId: string;
  name: string;
  /** "HH:mm:ss" time-of-day string, as returned by the backend's TimeSpan serialization. */
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export interface CreateShiftDto {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export interface UpdateShiftDto {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

export interface Staff {
  id: string;
  societyId: string;
  fullName: string;
  phone: string;
  photoUrl?: string;
  category: StaffCategory;
  employmentType: StaffEmploymentType;
  vendorId?: string;
  shiftId?: string;
  shiftName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  fullName: string;
  phone: string;
  category: StaffCategory;
  employmentType: StaffEmploymentType;
  photoUrl?: string;
  vendorId?: string;
  shiftId?: string;
}

export interface UpdateStaffDto {
  fullName: string;
  phone: string;
  photoUrl?: string;
  shiftId?: string;
}

export interface StaffAttendance {
  id: string;
  societyId: string;
  staffId: string;
  staffName: string;
  shiftId?: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  isLate: boolean;
  status: StaffAttendanceStatus;
}

export interface StaffAttendanceReportEntry {
  staffId: string;
  staffName: string;
  category: StaffCategory;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  onLeaveDays: number;
}

export interface StaffAttendanceReport {
  fromDate: string;
  toDate: string;
  entries: StaffAttendanceReportEntry[];
}
