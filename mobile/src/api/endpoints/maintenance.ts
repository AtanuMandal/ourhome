import api from '../client';
import type { MaintenanceCharge, PaginatedResponse } from '../types';

export const maintenanceApi = {
  getMaintenanceCharges: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<MaintenanceCharge>>(
        `/societies/${societyId}/maintenance/charges`,
        { params }
      )
      .then((r) => r.data),

  // Backend: POST /maintenance/payments/proof — body: { chargeIds: string[], proofUrl, notes? }
  submitPaymentProof: (societyId: string, chargeIds: string[], proofUrl: string, notes?: string) =>
    api
      .post(
        `/societies/${societyId}/maintenance/payments/proof`,
        { chargeIds, proofUrl, notes }
      )
      .then((r) => r.data),
};
