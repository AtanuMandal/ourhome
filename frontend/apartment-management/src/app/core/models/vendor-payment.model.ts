import { PagedResult } from './user.model';
import { ChargeStatus } from './charge-status.model';

export type VendorPaymentFrequency = 'Weekly' | 'BiWeekly' | 'Monthly' | 'Quarterly' | 'Yearly';
export type VendorChargeStatus = ChargeStatus;
export type VendorChargeType = 'Recurring' | 'AdHoc';

// Matches backend VendorContactDto — field names shortened to match its compressed JSON keys.
export interface VendorContact {
  fn: string; // firstName
  ln: string; // lastName
  ph: string; // phoneNumber
  em: string; // email
}

// Matches backend VendorDto — field names shortened to match its compressed JSON keys.
export interface VendorPaymentVendor {
  id: string;
  nm: string; // name
  addr: {
    str: string;
    cty: string;
    ste: string;
    pc: string;
    co: string;
  };
  pic?: string | null; // pictureUrl
  poc: VendorContact; // pointOfContact
  ov: string; // overview
  vud: string; // validUptoDate
  pdd: number; // paymentDueDays
  gsa?: string | null; // geographicServiceArea
  bt?: string | null; // businessType
  cu?: string | null; // contractUrl
  ac: boolean; // isActive
}

// Matches backend VendorRecurringScheduleDto — field names shortened to match its compressed JSON keys.
export interface VendorRecurringSchedule {
  id: string;
  fq: VendorPaymentFrequency; // frequency
  amt: number; // amount
  sd: string; // startDate
  ed?: string | null; // endDate
  ifd?: string | null; // inactiveFromDate
  lbl?: string | null; // label
  ac: boolean; // isActive
}

// Matches backend VendorChargeDto — field names shortened to match its compressed JSON keys.
export interface VendorCharge {
  id: string;
  vnm: string; // vendorName
  ct: VendorChargeType; // chargeType
  ds: string; // description
  efd: string; // effectiveDate
  cy: number; // chargeYear
  cm: number; // chargeMonth
  amt: number; // amount
  dd: string; // dueDate
  st: VendorChargeStatus; // status
  ac: boolean; // isActive
  ov: boolean; // isOverdue
  tr?: string | null; // transactionReference
  ru?: string | null; // receiptUrl
}

// Matches backend VendorChargeGridChargeDto — field names shortened to match its compressed JSON keys.
export interface VendorGridCharge {
  id: string;
  ct: VendorChargeType; // chargeType
  ds: string; // description
  amt: number; // amount
  st: VendorChargeStatus; // status
  ac: boolean; // isActive
  efd: string; // effectiveDate
  dd: string; // dueDate
  ov: boolean; // isOverdue
  ru?: string | null; // receiptUrl
}

// Matches backend VendorChargeGridCellDto — field names shortened to match its compressed JSON keys.
export interface VendorGridCell {
  mo: number; // month
  ta: number; // totalAmount
  pda: number; // paidAmount
  dua: number; // dueAmount
  ho: boolean; // hasOverdue
  chg: VendorGridCharge[]; // charges
}

// Matches backend VendorChargeGridRowDto — field names shortened to match its compressed JSON keys.
export interface VendorGridRow {
  vid: string; // vendorId
  vnm: string; // vendorName
  bt?: string | null; // businessType
  mos: VendorGridCell[]; // months
}

// Matches backend VendorChargeGridMonthTotalDto — field names shortened to match its compressed JSON keys.
export interface VendorGridMonthTotal {
  mo: number; // month
  ta: number; // totalAmount
  pda: number; // paidAmount
  dua: number; // dueAmount
}

// Matches backend VendorChargeGridDto — field names shortened to match its compressed JSON keys.
export interface VendorChargeGrid {
  mos: number[]; // months
  rows: VendorGridRow[];
  tot: VendorGridMonthTotal[]; // totals
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

// Matches backend VendorDocumentUploadResponse — distinct from the shared ChargeDocumentUploadResponse
// (this one is compressed; other unmigrated document-upload responses may still use full names).
export interface VendorDocumentUploadResponse {
  fn: string; // fileName
  fu: string; // fileUrl
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
