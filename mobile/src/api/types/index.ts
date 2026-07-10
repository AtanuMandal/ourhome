export type UserRole = 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser' | 'SUSecurity';
export type ResidentType = 'Owner' | 'Tenant' | 'CoOccupant' | 'FamilyMember' | 'SocietyAdmin';

// Matches backend ResidentApartmentDto — name is the formatted display label
export interface ResidentApartmentInfo {
  apartmentId: string;
  name: string;
  residentType: string;
}

export interface User {
  id: string;
  societyId: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  residentType: ResidentType;
  apartmentId?: string;
  isVerified: boolean;
  isActive: boolean;
  // Populated from UserResponse.Apartments — contains formatted display labels
  apartments?: ResidentApartmentInfo[];
}

export interface LoginRequest {
  email: string;
  password: string;
  selectedUserId?: string;
}

// Matches backend ApplicationDtos.AuthUserDto (field "name" not "fullName")
export interface AuthUserDto {
  id: string;
  societyId: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  residentType: string;
  apartmentId: string | null;
  isVerified: boolean;
  permissions: string[];
}

export interface LoginOptionDto {
  userId: string;
  societyId: string;
  societyName: string;
  apartmentId: string | null;
  apartmentLabel: string | null;
  role: UserRole;
  residentType: string;
}

// Matches backend ApplicationDtos.LoginResponse
export interface LoginResponse {
  requiresSelection: boolean;
  token: string | null;
  user: AuthUserDto | null;
  options: LoginOptionDto[];
}

// Matches backend VisitorResponse
export interface Visitor {
  id: string;
  societyId: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  companyName?: string;
  purpose: string;
  hostApartmentId: string;
  hostResidentName: string;
  hostBlockName: string;
  hostFloorNumber: number;
  hostFlatNumber: string;
  isPreApproved: boolean;
  status: string;
  passCode: string;
  qrCode?: string;
  vehicleNumber?: string;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: number;
  createdAt: string;
  validUntil?: string;
  visitorImageUrl?: string;
  isPassExpired: boolean;
}

// Matches backend NoticeResponse
export interface Notice {
  id: string;
  societyId: string;
  title: string;
  content: string;
  category: string;
  postedByUserId: string;
  isArchived: boolean;
  publishAt: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  targetApartmentIds: string[];
  isReadByCurrentUser: boolean;
}

// Matches backend ComplaintResponse
export interface Complaint {
  id: string;
  societyId: string;
  apartmentId: string;
  raisedByUserId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignedToUserId?: string;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  feedbackRating?: number;
  feedbackComment?: string;
}

// Matches backend MaintenanceChargeDto
export interface MaintenancePaymentProof {
  proofUrl: string;
  notes?: string;
  submittedByUserId: string;
  submittedAt: string;
}

export interface MaintenanceCharge {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentNumber: string;
  scheduleId: string;
  scheduleName: string;
  chargeYear: number;
  chargeMonth: number;
  amount: number;
  status: string;
  dueDate: string;
  isOverdue: boolean;
  paidAt?: string;
  paymentMethod?: string;
  transactionReference?: string;
  receiptUrl?: string;
  notes?: string;
  proofs: MaintenancePaymentProof[];
  createdAt: string;
  updatedAt: string;
}

export interface ApartmentResident {
  userId: string;
  userName: string;
  residentType: ResidentType;
}

export interface Apartment {
  id: string;
  societyId: string;
  apartmentNumber: string;
  blockName: string;
  floorNumber: number;
  status: string;
  residents: ApartmentResident[];
}

export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  description: string;
  capacity: number;
  rules: string;
  isActive: boolean;
  bookingSlotMinutes: number;
  operatingStart: string;
  operatingEnd: string;
  advanceBookingDays: number;
}

// Matches backend BookingResponse
export interface AmenityBooking {
  id: string;
  societyId: string;
  amenityId: string;
  amenityName: string;
  bookedByUserId: string;
  bookedByApartmentId: string;
  startTime: string;
  endTime: string;
  status: string;
  adminNotes?: string;
  duration: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

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

export type SosCategory = 'Fire' | 'Medical' | 'SecurityIntrusion' | 'Other';
export type SosAlertStatus = 'Triggered' | 'Acknowledged' | 'Resolved' | 'FalseAlarm';

export interface SosAlert {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentLabel: string;
  triggeredByUserId: string;
  triggeredByUserName: string;
  category: SosCategory;
  note?: string;
  status: SosAlertStatus;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedByUserId?: string;
  acknowledgedByUserName?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  escalationCount: number;
}

export interface SosCategoryBreakdown {
  category: SosCategory;
  count: number;
}

export interface SosAlertReport {
  fromDate: string;
  toDate: string;
  totalAlerts: number;
  falseAlarmCount: number;
  falseAlarmRatePercent: number;
  averageAcknowledgeSeconds?: number;
  averageResolveSeconds?: number;
  byCategory: SosCategoryBreakdown[];
}

export type PollType = 'SingleChoice' | 'MultipleChoice';
export type PollTargetAudience = 'FullSociety' | 'PerBlock' | 'MultipleBlock';
export type PollEligibilityUnit = 'PerApartment' | 'PerResident';
export type PollAnonymity = 'Anonymous' | 'Identified';
export type PollVisibility = 'Immediately' | 'AfterClose' | 'AdminOnly';
export type PollStatus = 'Scheduled' | 'Open' | 'Closed';
export type PollOutcome = 'Passed' | 'Failed' | 'NoQuorum';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollOptionTally {
  id: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  societyId: string;
  title: string;
  description: string;
  type: PollType;
  options: PollOption[];
  opensAt: string;
  closesAt: string;
  targetAudience: PollTargetAudience;
  targetBlockNames: string[];
  eligibilityUnit: PollEligibilityUnit;
  anonymity: PollAnonymity;
  visibility: PollVisibility;
  linkedNoticeId?: string;
  quorumThresholdPercent?: number;
  isAgmResolution: boolean;
  allowVoteChange: boolean;
  status: PollStatus;
  closedAt?: string;
  resultsPublished: boolean;
  outcome?: PollOutcome;
  createdByUserId: string;
  createdAt: string;
  tally?: PollOptionTally[];
  eligibleCount?: number;
  participantCount?: number;
  hasVoted: boolean;
  mySelectedOptionIds?: string[];
  agmSessionId?: string;
}

export interface PollSummary {
  id: string;
  title: string;
  type: PollType;
  opensAt: string;
  closesAt: string;
  status: PollStatus;
  isAgmResolution: boolean;
  resultsPublished: boolean;
}

export interface PollVoteResult {
  pollId: string;
  selectedOptionIds: string[];
  votedAt: string;
}

export interface AgmSessionSummary {
  id: string;
  title: string;
  sessionDate: string;
  resolutionCount: number;
}

export interface AgmSessionDetail {
  id: string;
  societyId: string;
  title: string;
  description: string;
  sessionDate: string;
  createdByUserId: string;
  createdAt: string;
  resolutions: Poll[];
}

export interface ApiError {
  error: string;
  details?: string;
  errorCode?: string;
}
