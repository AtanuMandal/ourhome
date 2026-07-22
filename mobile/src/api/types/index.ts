export type UserRole = 'HQAdmin' | 'HQUser' | 'SUAdmin' | 'SUUser' | 'SUSecurity';
export type ResidentType = 'Owner' | 'Tenant' | 'CoOccupant' | 'FamilyMember' | 'SocietyAdmin';

// Matches backend ResidentApartmentDto — name is the formatted display label
// Field names shortened to match its compressed JSON keys.
export interface ResidentApartmentInfo {
  aid: string; // apartmentId
  nm: string; // name
  rt: string; // residentType
}

// Matches backend UserResponse — field names shortened to match its compressed JSON keys.
export interface User {
  id: string;
  sid: string; // societyId
  fn: string; // fullName
  em: string; // email
  ph: string; // phone
  rl: UserRole; // role
  rt: ResidentType; // residentType
  aid?: string; // apartmentId
  vf: boolean; // isVerified
  ac: boolean; // isActive
  // Populated from UserResponse.Apartments — contains formatted display labels
  apts?: ResidentApartmentInfo[]; // apartments
  /** App-relative file URL of the profile picture (served via authenticated files endpoint). */
  pic?: string; // profilePictureUrl
  /** Apartment joining invitation awaiting this user's accept/deny. */
  paid?: string; // pendingApartmentId
  prt?: string; // pendingResidentType
}

export interface LoginRequest {
  email: string;
  password: string;
  selectedUserId?: string;
}

// Matches backend ApplicationDtos.AuthUserDto — field names shortened to match its compressed JSON keys.
export interface AuthUserDto {
  id: string;
  sid: string; // societyId
  nm: string; // name
  em: string; // email
  ph: string | null; // phone
  rl: UserRole; // role
  rt: string; // residentType
  aid: string | null; // apartmentId
  vf: boolean; // isVerified
  pic?: string | null; // profilePictureUrl
}

// Matches backend LoginOptionDto — field names shortened to match its compressed JSON keys.
export interface LoginOptionDto {
  uid: string; // userId
  sid: string; // societyId
  snm: string; // societyName
  aid: string | null; // apartmentId
  alb: string | null; // apartmentLabel
  rl: UserRole; // role
  rt: string; // residentType
}

// Matches backend ApplicationDtos.LoginResponse — field names shortened to match its compressed JSON keys.
export interface LoginResponse {
  rs: boolean; // requiresSelection
  tok: string | null; // token
  usr: AuthUserDto | null; // user
  opts: LoginOptionDto[]; // options
}

// Matches backend VisitorResponse — field names are shortened to match its compressed JSON keys.
export interface Visitor {
  id: string;
  vn: string; // visitorName
  vp: string; // visitorPhone
  ve?: string; // visitorEmail
  cn?: string; // companyName
  pu: string; // purpose
  aid: string; // hostApartmentId
  hrn: string; // hostResidentName
  hbn: string; // hostBlockName
  hfn: number; // hostFloorNumber
  hft: string; // hostFlatNumber
  ipa: boolean; // isPreApproved
  st: string; // status
  pc: string; // passCode
  qr?: string; // qrCode
  vh?: string; // vehicleNumber
  cit?: string; // checkInTime
  cot?: string; // checkOutTime
  ca: string; // createdAt
  vu?: string; // validUntil
  img?: string; // visitorImageUrl
  ipe: boolean; // isPassExpired
  /** Checked in past the society's overstay threshold — render in red. */
  ov?: boolean; // isOverstay
}

// Matches backend NoticeResponse
// Field names are shortened to match the backend's compressed JSON keys (see NoticeResponse).
export interface Notice {
  id: string;
  tt: string; // title
  ct: string; // content
  cat: string; // category
  pid: string; // postedByUserId
  pa: string; // publishAt
  ea?: string; // expiresAt
  rd: boolean; // isReadByCurrentUser
  /** Full name of the poster — always show this instead of the raw user id. */
  pn?: string; // postedByName
}

// Matches backend ComplaintResponse — field names shortened to match its compressed JSON keys.
export interface Complaint {
  id: string;
  tt: string; // title
  ds: string; // description
  cat: string; // category
  st: string; // status
  pr: string; // priority
  ca: string; // createdAt
  ra?: string; // resolvedAt
}

// Matches backend MaintenancePaymentProofDto — field names shortened to match its compressed JSON keys.
export interface MaintenancePaymentProof {
  pu: string; // proofUrl
  nt?: string; // notes
  sa: string; // submittedAt
}

// Matches backend MaintenanceChargeDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceCharge {
  id: string;
  aid: string; // apartmentId
  anm: string; // apartmentNumber
  sid: string; // scheduleId
  snm: string; // scheduleName
  cy: number; // chargeYear
  cm: number; // chargeMonth
  amt: number; // amount
  st: string; // status
  dd: string; // dueDate
  ov: boolean; // isOverdue
  pa?: string; // paidAt
  pm?: string; // paymentMethod
  tr?: string; // transactionReference
  ru?: string; // receiptUrl
  nt?: string; // notes
  pf: MaintenancePaymentProof[]; // proofs
  rr?: string | null; // rejectionReason
  ra?: string | null; // rejectedAt
  /** Latest proof's group id — charges submitted together (a clubbed submission) share this. */
  sgi?: string | null; // submissionGroupId
}

export interface ApartmentResident {
  uid: string; // userId
  unm: string; // userName
  rt: ResidentType; // residentType
}

// Field names are shortened to match the backend's compressed JSON keys (see ApartmentResponse).
export interface Apartment {
  id: string;
  num: string; // apartmentNumber
  blk: string; // blockName
  flr: number; // floorNumber
  st: string; // status
  res: ApartmentResident[]; // residents
}

// Field names are shortened to match the backend's compressed JSON keys.
export interface Amenity {
  id: string;
  nm: string; // name
  ds: string; // description
  cap: number; // capacity
  ac: boolean; // isActive
  os: string; // operatingStart
  oe: string; // operatingEnd
}

// Matches backend BookingResponse — field names shortened to match its compressed JSON keys.
export interface AmenityBooking {
  id: string;
  an: string; // amenityName
  uid: string; // bookedByUserId
  stt: string; // startTime
  ent: string; // endTime
  st: string; // status
  adn?: string; // adminNotes
  /** Set when the booking was cancelled — remarks are shown to the booking owner. */
  cr?: string; // cancellationRemarks
  cid?: string; // cancelledByUserId
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

// Matches backend ShiftResponse — field names shortened to match its compressed JSON keys.
export interface Shift {
  id: string;
  nm: string; // name
}

// Matches backend StaffResponse — field names shortened to match its compressed JSON keys.
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

// Matches backend StaffAttendanceResponse — only StaffId is ever read by either client.
export interface StaffAttendance {
  sid: string; // staffId
}

// Matches backend StaffAttendanceReportEntry — field names shortened to match its compressed JSON keys.
export interface StaffAttendanceReportEntry {
  sid: string; // staffId
  sn: string; // staffName
  cat: StaffCategory; // category
  pd: number; // presentDays
  ad: number; // absentDays
  ld: number; // lateDays
  od: number; // onLeaveDays
}

// Matches backend StaffAttendanceReportResponse — field names shortened to match its compressed JSON keys.
export interface StaffAttendanceReport {
  fd: string; // fromDate
  td: string; // toDate
  e: StaffAttendanceReportEntry[]; // entries
}

export type SosCategory = 'Fire' | 'Medical' | 'SecurityIntrusion' | 'Other';
export type SosAlertStatus = 'Triggered' | 'Acknowledged' | 'Resolved' | 'FalseAlarm';

// Matches backend SosAlertResponse — field names shortened to match its compressed JSON keys.
export interface SosAlert {
  id: string;
  al: string; // apartmentLabel
  un: string; // triggeredByUserName
  cat: SosCategory; // category
  nt?: string; // note
  st: SosAlertStatus; // status
  ta: string; // triggeredAt
  aun?: string; // acknowledgedByUserName
  run?: string; // resolvedByUserName
  ec: number; // escalationCount
}

// Matches backend SosCategoryBreakdown — field names shortened to match its compressed JSON keys.
export interface SosCategoryBreakdown {
  cat: SosCategory; // category
  ct: number; // count
}

// Matches backend SosAlertReportResponse — field names shortened to match its compressed JSON keys.
export interface SosAlertReport {
  ta: number; // totalAlerts
  fr: number; // falseAlarmRatePercent
  aa?: number; // averageAcknowledgeSeconds
  ar?: number; // averageResolveSeconds
  bc: SosCategoryBreakdown[]; // byCategory
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
  tx: string; // text
}

export interface PollOptionTally {
  id: string;
  tx: string; // text
  vc: number; // voteCount
}

// Matches backend PollResponse — field names shortened to match its compressed JSON keys.
export interface Poll {
  id: string;
  tt: string; // title
  ds: string; // description
  ty: PollType; // type
  op: PollOption[]; // options
  oa: string; // opensAt
  ca: string; // closesAt
  ta: PollTargetAudience; // targetAudience
  tbn: string[]; // targetBlockNames
  agm: boolean; // isAgmResolution
  avc: boolean; // allowVoteChange
  st: PollStatus; // status
  rp: boolean; // resultsPublished
  oc?: PollOutcome; // outcome
  tl?: PollOptionTally[]; // tally
  elc?: number; // eligibleCount
  pc?: number; // participantCount
  hv: boolean; // hasVoted
  mso?: string[]; // mySelectedOptionIds
}

// Matches backend PollSummaryResponse — field names shortened to match its compressed JSON keys.
export interface PollSummary {
  id: string;
  tt: string; // title
  ty: PollType; // type
  ca: string; // closesAt
  st: PollStatus; // status
  agm: boolean; // isAgmResolution
}

export interface PollVoteResult {
  pid: string; // pollId
  so: string[]; // selectedOptionIds
  va: string; // votedAt
}

// Matches backend AgmSessionSummaryResponse — field names shortened to match its compressed JSON keys.
export interface AgmSessionSummary {
  id: string;
  tt: string; // title
  sd: string; // sessionDate
  rc: number; // resolutionCount
}

// Matches backend AgmSessionDetailResponse — field names shortened to match its compressed JSON keys.
export interface AgmSessionDetail {
  id: string;
  tt: string; // title
  ds: string; // description
  sd: string; // sessionDate
  r: Poll[]; // resolutions
}

export interface ApiError {
  error: string;
  details?: string;
  errorCode?: string;
  /** The OTel trace ID of the failing request — see requirements/telemetry_observability.md "The errorId Contract". */
  errorId?: string;
}
