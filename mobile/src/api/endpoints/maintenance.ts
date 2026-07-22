import api from '../client';
import { getToken } from '../../auth/tokenStore';
import type { PickedFile } from '../../camera/ImagePicker';
import type { MaintenanceCharge, PaginatedResponse } from '../types';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://192.168.1.2:7071/api';

// Matches backend MaintenanceProofUploadResponse — field names shortened to match its compressed JSON keys.
export interface MaintenanceProofUploadResult {
  fn: string; // fileName
  fu: string; // fileUrl
}

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

  // Backend: POST /maintenance/payments/proof/upload — multipart form field "file".
  // Returns an app-relative path (served via the file proxy), not a raw blob/SAS URL.
  // Uses fetch/FormData (rather than expo-file-system's uploadAsync) so the real filename and
  // mime type — needed to tell images apart from PDF/Word/Excel documents at render time — are
  // sent exactly as picked, instead of whatever expo-file-system infers from the local uri.
  uploadPaymentProof: async (societyId: string, file: PickedFile): Promise<MaintenanceProofUploadResult> => {
    const token = await getToken();
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    const response = await fetch(`${BASE_URL}/societies/${societyId}/maintenance/payments/proof/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    return (await response.json()) as MaintenanceProofUploadResult;
  },

  // Backend: POST /maintenance/payments/proof — body: { chargeIds: string[], proofUrl, notes? }
  submitPaymentProof: (societyId: string, chargeIds: string[], proofUrl: string, notes?: string) =>
    api
      .post(
        `/societies/${societyId}/maintenance/payments/proof`,
        { chargeIds, proofUrl, notes }
      )
      .then((r) => r.data),

  // Admin: accept a resident's submitted proof and mark the charge paid.
  approveProof: (societyId: string, chargeId: string, data: { paymentMethod?: string; transactionReference?: string; notes?: string }) =>
    api
      .post<boolean>(`/societies/${societyId}/maintenance/charges/${chargeId}/approve`, data)
      .then((r) => r.data),

  // Admin: mark a charge paid directly (cash/offline payment, no proof).
  markPaid: (societyId: string, chargeId: string, data: { paymentMethod?: string; transactionReference?: string; notes?: string }) =>
    api
      .post<boolean>(`/societies/${societyId}/maintenance/charges/${chargeId}/mark-paid`, data)
      .then((r) => r.data),

  // Admin: deny a submitted proof with a comment — the charge falls back to Rejected (resubmittable).
  denyProof: (societyId: string, chargeId: string, reason: string) =>
    api
      .post<MaintenanceCharge>(`/societies/${societyId}/maintenance/charges/${chargeId}/deny`, { reason })
      .then((r) => r.data),

  // Admin: approve every charge in a clubbed submission (several charges, one proof) at once.
  approveProofGroup: (
    societyId: string,
    chargeIds: string[],
    data: { paymentMethod: string; transactionReference?: string; receiptUrl?: string; notes?: string }
  ) =>
    api
      .post<MaintenanceCharge[]>(`/societies/${societyId}/maintenance/charges/group/approve`, { chargeIds, ...data })
      .then((r) => r.data),

  // Admin: deny every charge in a clubbed submission at once, with one comment.
  denyProofGroup: (societyId: string, chargeIds: string[], reason: string) =>
    api
      .post<MaintenanceCharge[]>(`/societies/${societyId}/maintenance/charges/group/deny`, { chargeIds, reason })
      .then((r) => r.data),
};
