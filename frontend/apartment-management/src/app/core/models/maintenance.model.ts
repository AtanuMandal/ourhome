import { PagedResult } from './user.model';

export type MaintenancePricingType = 'FixedAmount' | 'PerSquareFoot';
export type MaintenanceAreaBasis = 'CarpetArea' | 'BuildUpArea' | 'SuperBuildUpArea';
export type MaintenanceFrequency = 'Monthly' | 'Quarterly' | 'Annual' | 'OneTime';
export type MaintenanceChargeStatus = 'Pending' | 'ProofSubmitted' | 'Paid' | 'Failed' | 'Rejected' | 'Overdue' | 'Cancelled';

export interface MaintenanceScheduleChange {
  previousRate: number;
  newRate: number;
  areaBasis?: MaintenanceAreaBasis | null;
  changedByUserId: string;
  changedByUserName: string;
  reason: string;
  changedAt: string;
}

export interface MaintenanceSchedule {
  id: string;
  societyId: string;
  apartmentId?: string | null;
  name: string;
  description?: string | null;
  rate: number;
  pricingType: MaintenancePricingType;
  areaBasis?: MaintenanceAreaBasis | null;
  frequency: MaintenanceFrequency;
  dueDay: number;
  nextDueDate: string;
  isActive: boolean;
  changeHistory: MaintenanceScheduleChange[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePaymentProof {
  proofUrl: string;
  notes?: string | null;
  submittedByUserId: string;
  submittedAt: string;
}

export interface MaintenanceGridCharge {
  id: string;
  scheduleId: string;
  scheduleName: string;
  amount: number;
  status: MaintenanceChargeStatus;
  dueDate: string;
  isOverdue: boolean;
  paidAt?: string | null;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  proofs: MaintenancePaymentProof[];
}

export interface MaintenanceGridCell {
  month: number;
  totalAmount: number;
  hasOverdue: boolean;
  charges: MaintenanceGridCharge[];
}

export interface MaintenanceGridRow {
  apartmentId: string;
  apartmentNumber: string;
  residentName?: string | null;
  months: MaintenanceGridCell[];
}

export interface MaintenanceChargeGrid {
  societyId: string;
  year: number;
  months: number[];
  rows: MaintenanceGridRow[];
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
  status: MaintenanceChargeStatus;
  dueDate: string;
  isOverdue: boolean;
  paidAt?: string | null;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  proofs: MaintenancePaymentProof[];
  createdAt: string;
  updatedAt: string;
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
}

export interface UpdateMaintenanceScheduleDto extends CreateMaintenanceScheduleDto {
  isActive: boolean;
  changeReason: string;
}

export interface SubmitMaintenancePaymentProofDto {
  chargeIds: string[];
  proofUrl: string;
  notes?: string | null;
}

export interface MarkMaintenanceChargePaidDto {
  paymentMethod: string;
  transactionReference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface MaintenanceChargeFilters {
  apartmentId?: string;
  year?: number;
  month?: number;
  status?: MaintenanceChargeStatus;
  page?: number;
  pageSize?: number;
}

export type MaintenanceChargeResult = PagedResult<MaintenanceCharge>;
