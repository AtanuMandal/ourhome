export type ChargeStatus = 'Pending' | 'ProofSubmitted' | 'Paid' | 'Failed' | 'Rejected' | 'Overdue' | 'Cancelled';

export interface ChargeDocumentUploadResponse {
  fileName: string;
  fileUrl: string;
}
