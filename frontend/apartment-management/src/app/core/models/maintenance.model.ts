import { PagedResult } from './user.model';
import { ChargeStatus } from './charge-status.model';

export type MaintenancePricingType = 'FixedAmount' | 'PerSquareFoot';
export type MaintenanceAreaBasis = 'CarpetArea' | 'BuildUpArea' | 'SuperBuildUpArea';
export type MaintenanceFrequency = 'Monthly' | 'Quarterly' | 'Annual';
export type MaintenanceChargeStatus = ChargeStatus;

// Matches backend MaintenanceScheduleChangeDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceScheduleChange {
  pr: number; // previousRate
  nr: number; // newRate
  cbn: string; // changedByUserName
  rsn: string; // reason
  ca: string; // changedAt
}

// Matches backend MaintenanceScheduleDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceSchedule {
  id: string;
  aid?: string | null; // apartmentId
  nm: string; // name
  ds?: string | null; // description
  rt: number; // rate
  pt: MaintenancePricingType; // pricingType
  ab?: MaintenanceAreaBasis | null; // areaBasis
  fq: MaintenanceFrequency; // frequency
  dd: number; // dueDay
  sm: number; // startMonth
  sy: number; // startYear
  em: number; // endMonth
  ey: number; // endYear
  afd: string; // activeFromDate
  aud: string; // activeUntilDate
  ifd?: string | null; // inactiveFromDate
  ndd: string; // nextDueDate
  ac: boolean; // isActive
  ch: MaintenanceScheduleChange[]; // changeHistory
}

// Matches backend MaintenancePaymentProofDto — field names shortened to match its compressed JSON keys.
export interface MaintenancePaymentProof {
  pu: string; // proofUrl
  nt?: string | null; // notes
  sa: string; // submittedAt
}

// Matches backend MaintenanceChargeGridChargeDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceGridCharge {
  id: string;
  sid: string; // scheduleId
  snm: string; // scheduleName
  amt: number; // amount
  st: MaintenanceChargeStatus; // status
  dd: string; // dueDate
  ov: boolean; // isOverdue
  pa?: string | null; // paidAt
  pm?: string | null; // paymentMethod
  tr?: string | null; // transactionReference
  ru?: string | null; // receiptUrl
  nt?: string | null; // notes
  pf: MaintenancePaymentProof[]; // proofs
  rr?: string | null; // rejectionReason
  ra?: string | null; // rejectedAt
  /** Latest proof's group id — charges submitted together (a clubbed submission) share this. */
  sgi?: string | null; // submissionGroupId
}

// Matches backend MaintenanceChargeGridCellDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceGridCell {
  mo: number; // month
  ta: number; // totalAmount
  ho: boolean; // hasOverdue
  chg: MaintenanceGridCharge[]; // charges
}

// Matches backend MaintenanceChargeGridRowDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceGridRow {
  aid: string; // apartmentId
  anm: string; // apartmentNumber
  rn?: string | null; // residentName
  mos: MaintenanceGridCell[]; // months
}

// Matches backend MaintenanceChargeGridDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceChargeGrid {
  mos: number[]; // months
  sum: MaintenanceChargeGridSummary; // summary
  rows: MaintenanceGridRow[];
}

// Matches backend MaintenanceChargeGridSummaryDto — field names shortened to match its compressed JSON keys.
export interface MaintenanceChargeGridSummary {
  pa: number; // pendingAmount
  sa: number; // submittedAmount
  pda: number; // paidAmount
  pc: number; // pendingCount
  sc: number; // submittedCount
  pdc: number; // paidCount
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
  st: MaintenanceChargeStatus; // status
  dd: string; // dueDate
  ov: boolean; // isOverdue
  pa?: string | null; // paidAt
  pm?: string | null; // paymentMethod
  tr?: string | null; // transactionReference
  ru?: string | null; // receiptUrl
  nt?: string | null; // notes
  pf: MaintenancePaymentProof[]; // proofs
  rr?: string | null; // rejectionReason
  ra?: string | null; // rejectedAt
  sgi?: string | null; // submissionGroupId
}

export interface CreateMaintenanceScheduleDto {
  name: string;
  description?: string | null;
  apartmentId?: string | null;
  rate: number;
  pricingType: MaintenancePricingType;
  areaBasis?: MaintenanceAreaBasis | null;
  frequency: MaintenanceFrequency;
  dueDay: number;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

export interface UpdateMaintenanceScheduleDto {
  isActive: boolean;
  effectiveMonth: number;
  effectiveYear: number;
  changeReason: string;
}

export interface DeleteMaintenanceScheduleDto {
  changeReason: string;
}

export interface SubmitMaintenancePaymentProofDto {
  chargeIds: string[];
  proofUrl: string;
  notes?: string | null;
}

// Matches backend MaintenanceProofUploadResponse — distinct from the shared ChargeDocumentUploadResponse
// (vendor payments' upload response keeps full field names; this one is compressed).
export interface MaintenanceProofUploadResponse {
  fn: string; // fileName
  fu: string; // fileUrl
}

export interface MarkMaintenanceChargePaidDto {
  paymentMethod: string;
  transactionReference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface DenyMaintenancePaymentProofDto {
  reason: string;
}

export interface ApproveMaintenancePaymentProofGroupDto {
  chargeIds: string[];
  paymentMethod: string;
  transactionReference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface DenyMaintenancePaymentProofGroupDto {
  chargeIds: string[];
  reason: string;
}

export interface CreateMaintenancePenaltyChargeDto {
  apartmentId: string;
  amount: number;
  dueDate: string;
  reason: string;
}

export interface MaintenanceChargeFilters {
  apartmentId?: string;
  year?: number;
  month?: number;
  status?: MaintenanceChargeStatus;
  page?: number;
  pageSize?: number;
}

export interface MaintenanceGridFilters {
  financialYearStart: number;
  apartmentId?: string;
  block?: string;
  floor?: number;
  status?: MaintenanceChargeStatus;
  fromDate?: string;
  toDate?: string;
}

export type MaintenanceChargeResult = PagedResult<MaintenanceCharge>;
