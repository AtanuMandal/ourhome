import api from '../client';
import type { PaginatedResponse } from '../types';

export interface VendorPayment {
  id: string;
  societyId: string;
  vendorName: string;
  vendorPhone: string;
  category: string;
  amount: number;
  paymentDate: string;
  status: string;
  description: string;
  invoiceUrl?: string;
}

export const vendorPaymentsApi = {
  getVendorPayments: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<VendorPayment>>(
        `/societies/${societyId}/vendor-payments`,
        { params }
      )
      .then((r) => r.data),

  getVendorPayment: (societyId: string, id: string) =>
    api
      .get<VendorPayment>(`/societies/${societyId}/vendor-payments/${id}`)
      .then((r) => r.data),
};
