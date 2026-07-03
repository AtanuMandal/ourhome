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

  getCharge: (societyId: string, id: string) =>
    api
      .get<MaintenanceCharge>(`/societies/${societyId}/maintenance/charges/${id}`)
      .then((r) => r.data),

  submitPaymentProof: (societyId: string, id: string, proofUrl: string) =>
    api
      .patch<MaintenanceCharge>(
        `/societies/${societyId}/maintenance/charges/${id}/payment-proof`,
        { proofUrl }
      )
      .then((r) => r.data),
};
