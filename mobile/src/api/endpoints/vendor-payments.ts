import api from '../client';
import type { PaginatedResponse } from '../types';

// Matches backend VendorChargeDto
export interface VendorCharge {
  id: string;
  societyId: string;
  vendorId: string;
  vendorName: string;
  scheduleId?: string;
  chargeType: string;
  description: string;
  effectiveDate: string;
  chargeYear: number;
  chargeMonth: number;
  amount: number;
  dueDate: string;
  status: string;
  isActive: boolean;
  isOverdue: boolean;
  paidAt?: string;
  paymentMethod?: string;
  transactionReference?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
};
