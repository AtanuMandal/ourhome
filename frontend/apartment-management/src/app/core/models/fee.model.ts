export type FeeType = 'Maintenance' | 'Parking' | 'Utility' | 'Special' | 'Other';
export type PaymentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Waived';

export interface FeeSchedule {
  id: string;
  societyId: string;
  name: string;
  type: FeeType;
  amount: number;
  dueDay: number;
  frequency: 'Monthly' | 'Quarterly' | 'Annually' | 'OneTime';
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentUnit?: string;
  feeScheduleId: string;
  feeScheduleName?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  paidBy?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateFeeScheduleDto {
  name: string;
  type: FeeType;
  amount: number;
  dueDay: number;
  frequency: 'Monthly' | 'Quarterly' | 'Annually' | 'OneTime';
  description?: string;
}

export interface MarkPaymentPaidDto {
  paidBy: string;
  paidDate: string;
  receiptNumber?: string;
  notes?: string;
}
