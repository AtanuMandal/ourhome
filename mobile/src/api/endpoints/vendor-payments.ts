import api from '../client';
import type { PaginatedResponse } from '../types';

// Matches backend VendorChargeDto — field names shortened to match its compressed JSON keys.
export interface VendorCharge {
  id: string;
  vnm: string; // vendorName
  ct: string; // chargeType
  ds: string; // description
  efd: string; // effectiveDate
  cy: number; // chargeYear
  cm: number; // chargeMonth
  amt: number; // amount
  dd: string; // dueDate
  st: string; // status
  ac: boolean; // isActive
  ov: boolean; // isOverdue
  tr?: string; // transactionReference
  ru?: string; // receiptUrl
}

export interface MarkVendorChargePaidRequest {
  paymentMethod: string;
  transactionReference?: string;
  receiptUrl?: string;
  notes?: string;
}

export const vendorPaymentsApi = {
  // Backend: GET /vendor-payments/charges — paged list of vendor charges
  getVendorCharges: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<VendorCharge>>(
        `/societies/${societyId}/vendor-payments/charges`,
        { params }
      )
      .then((r) => r.data),

  markPaid: (societyId: string, chargeId: string, data: MarkVendorChargePaidRequest) =>
    api
      .post<VendorCharge>(`/societies/${societyId}/vendor-payments/charges/${chargeId}/mark-paid`, data)
      .then((r) => r.data),

  activateCharge: (societyId: string, chargeId: string) =>
    api
      .post<VendorCharge>(`/societies/${societyId}/vendor-payments/charges/${chargeId}/activate`, {})
      .then((r) => r.data),

  inactivateCharge: (societyId: string, chargeId: string) =>
    api
      .post<VendorCharge>(`/societies/${societyId}/vendor-payments/charges/${chargeId}/inactivate`, {})
      .then((r) => r.data),

  deleteCharge: (societyId: string, chargeId: string) =>
    api
      .delete<boolean>(`/societies/${societyId}/vendor-payments/charges/${chargeId}`)
      .then((r) => r.data),
};
