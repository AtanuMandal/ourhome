export interface FeeSchedule {
  id: string;
  societyId: string;
  apartmentId?: string;
  description: string;
  amount: number;
  amountType: 'Fixed' | 'PerSquareFoot';
  areaBasis?: 'CarpetArea' | 'BuildUpArea' | 'SuperBuildUpArea';
  frequency: 'Monthly' | 'Quarterly' | 'Annual';
  dueDay: number;
  nextDueDate: string;
  isActive: boolean;
}

export interface FeePayment {
  id: string;
  societyId: string;
  apartmentId: string;
  feeScheduleId: string;
  description: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Failed' | 'Overdue' | 'Cancelled';
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
}
