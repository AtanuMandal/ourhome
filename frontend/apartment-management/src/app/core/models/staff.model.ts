export type StaffCategory = 'Security' | 'Housekeeping' | 'Gardener' | 'Plumber' | 'Electrician' | 'Other';
export type StaffEmploymentType = 'OnPayroll' | 'Contractor';
export type StaffAttendanceStatus = 'CheckedIn' | 'CheckedOut' | 'Absent' | 'OnLeave';

// Matches backend ShiftResponse DTO — field names shortened to match its compressed JSON keys.
export interface Shift {
  id: string;
  nm: string; // name
}

export interface CreateShiftDto {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
}

// Matches backend StaffResponse DTO — field names shortened to match its compressed JSON keys.
export interface Staff {
  id: string;
  fn: string; // fullName
  ph: string; // phone
  cat: StaffCategory; // category
  et: StaffEmploymentType; // employmentType
  sid?: string; // shiftId
  sn?: string; // shiftName
  ac: boolean; // isActive
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

// Matches backend StaffAttendanceResponse DTO — only StaffId is ever read by either client.
export interface StaffAttendance {
  sid: string; // staffId
}

// Matches backend StaffAttendanceReportEntry DTO — field names shortened to match its compressed JSON keys.
export interface StaffAttendanceReportEntry {
  sid: string; // staffId
  sn: string; // staffName
  cat: StaffCategory; // category
  pd: number; // presentDays
  ad: number; // absentDays
  ld: number; // lateDays
  od: number; // onLeaveDays
}

// Matches backend StaffAttendanceReportResponse DTO — field names shortened to match its compressed JSON keys.
export interface StaffAttendanceReport {
  fd: string; // fromDate
  td: string; // toDate
  e: StaffAttendanceReportEntry[]; // entries
}
