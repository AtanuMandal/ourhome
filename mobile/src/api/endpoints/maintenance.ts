import * as FileSystem from 'expo-file-system';
import api from '../client';
import { getToken } from '../../auth/tokenStore';
import type { MaintenanceCharge, PaginatedResponse } from '../types';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://192.168.1.5:7071/api';

export interface MaintenanceProofUploadResult {
  fileName: string;
  fileUrl: string;
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
  uploadPaymentProof: async (societyId: string, uri: string): Promise<MaintenanceProofUploadResult> => {
    const token = await getToken();
    const response = await FileSystem.uploadAsync(
      `${BASE_URL}/societies/${societyId}/maintenance/payments/proof/upload`,
      uri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    return JSON.parse(response.body) as MaintenanceProofUploadResult;
  },

  // Backend: POST /maintenance/payments/proof — body: { chargeIds: string[], proofUrl, notes? }
  submitPaymentProof: (societyId: string, chargeIds: string[], proofUrl: string, notes?: string) =>
    api
      .post(
        `/societies/${societyId}/maintenance/payments/proof`,
        { chargeIds, proofUrl, notes }
      )
      .then((r) => r.data),
};
