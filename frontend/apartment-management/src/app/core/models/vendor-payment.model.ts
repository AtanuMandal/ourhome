import { PagedResult } from './user.model';

export type VendorPaymentFrequency = 'Weekly' | 'BiWeekly' | 'Monthly' | 'Quarterly' | 'Yearly';
export type VendorChargeStatus = 'Pending' | 'ProofSubmitted' | 'Paid' | 'Failed' | 'Rejected' | 'Overdue' | 'Cancelled';
export type VendorChargeType = 'Recurring' | 'AdHoc';

export interface VendorContact {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export interface VendorPaymentVendor {
  id: string;
  societyId: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  pictureUrl?: string | null;
  pointOfContact: VendorContact;
  overview: string;
  validUptoDate: string;
  paymentDueDays: number;
  geographicServiceArea?: string | null;
  businessType?: string | null;
  contractUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRecurringSchedule {
  id: string;
  societyId: string;
  vendorId: string;
  vendorName: string;
  frequency: VendorPaymentFrequency;
  amount: number;
  monthlyEquivalentAmount: number;
  annualEquivalentAmount: number;
  startDate: string;
  endDate?: string | null;
  inactiveFromDate?: string | null;
  nextChargeDate: string;
  label?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorCharge {
  id: string;
  societyId: string;
  vendorId: string;
  vendorName: string;
  scheduleId?: string | null;
  chargeType: VendorChargeType;
  description: string;
  effectiveDate: string;
  chargeYear: number;
  chargeMonth: number;
  amount: number;
  dueDate: string;
  status: VendorChargeStatus;
  isActive: boolean;
  isOverdue: boolean;
  paidAt?: string | null;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorGridCharge {
  id: string;
  scheduleId?: string | null;
  chargeType: VendorChargeType;
  description: string;
  amount: number;
  status: VendorChargeStatus;
  isActive: boolean;
  effectiveDate: string;
  dueDate: string;
  isOverdue: boolean;
  paidAt?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface VendorGridCell {
  month: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  hasOverdue: boolean;
  charges: VendorGridCharge[];
}

export interface VendorGridRow {
  vendorId: string;
  vendorName: string;
  businessType?: string | null;
  months: VendorGridCell[];
}

export interface VendorGridMonthTotal {
  month: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
}

export interface VendorChargeGrid {
  societyId: string;
  year: number;
  months: number[];
  rows: VendorGridRow[];
  totals: VendorGridMonthTotal[];
}

export interface CreateVendorDto {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  pictureUrl?: string | null;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  overview: string;
  validUptoDate: string;
  paymentDueDays: number;
  geographicServiceArea?: string | null;
  businessType?: string | null;
  contractUrl?: string | null;
}

export interface UpdateVendorDto extends CreateVendorDto {
  isActive: boolean;
}

export interface CreateVendorRecurringScheduleDto {
  vendorId: string;
  frequency: VendorPaymentFrequency;
  amount: number;
  startDate: string;
  endDate?: string | null;
  label?: string | null;
}

export interface UpdateVendorRecurringScheduleDto {
  endDate?: string | null;
  inactiveFromDate?: string | null;
}

export interface CreateVendorOneTimeChargeDto {
  vendorId: string;
  amount: number;
  effectiveDate: string;
  description?: string | null;
}

export interface MarkVendorChargePaidDto {
  paymentDate: string;
  paymentMethod: string;
  transactionReference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface VendorDocumentUploadResponse {
  fileName: string;
  fileUrl: string;
}

export interface VendorChargeFilters {
  vendorId?: string;
  year?: number;
  month?: number;
  status?: VendorChargeStatus;
  page?: number;
  pageSize?: number;
}

export type VendorChargeResult = PagedResult<VendorCharge>;
