export interface OverdueApartment {
  apartmentId: string;
  apartmentLabel: string;
  overdueAmount: number;
  daysOverdue: number;
}

export interface UpcomingVendorDue {
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

export interface FinancialDashboard {
  month: number;
  year: number;
  monthLabel: string;
  maintenanceBilled: number;
  maintenanceCollected: number;
  maintenancePending: number;
  maintenanceOverdue: number;
  collectionEfficiencyPercent: number;
  vendorBilled: number;
  vendorPaid: number;
  vendorOutstanding: number;
  netPosition: number;
  topOverdueApartments: OverdueApartment[];
  upcomingVendorDues: UpcomingVendorDue[];
}

export interface CashFlowMonth {
  year: number;
  month: number;
  monthLabel: string;
  maintenanceCollected: number;
  totalCashIn: number;
  vendorPaid: number;
  totalCashOut: number;
  netCash: number;
}

export interface CashFlow {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
  months: CashFlowMonth[];
  totalCashIn: number;
  totalCashOut: number;
  netPosition: number;
}

export interface LedgerEntry {
  date: string;
  description: string;
  type: 'Charge' | 'Payment';
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface ApartmentLedger {
  apartmentId: string;
  apartmentLabel: string;
  primaryResidentName: string | null;
  currentOutstanding: number;
  entries: LedgerEntry[];
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentageOfTotal: number;
}

export interface SocietySummary {
  currentMonth: number;
  currentYear: number;
  totalDueCurrentMonth: number;
  totalCollectedCurrentMonth: number;
  collectionPercentageCurrentMonth: number;
  vendorExpensesCurrentMonth: number;
  netCurrentMonth: number;
  totalCollectedYtd: number;
  totalVendorExpensesYtd: number;
  netYtd: number;
  expenseBreakdownYtd: ExpenseCategory[];
}

export interface PersonalCharge {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  status: string;
  submittedOn: string | null;
  approvedOn: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
}

export interface PersonalStatement {
  apartmentId: string;
  apartmentLabel: string;
  year: number;
  totalCharged: number;
  totalPaid: number;
  totalOutstanding: number;
  charges: PersonalCharge[];
}

export interface FinancialReportFilters {
  fromMonth?: number;
  fromYear?: number;
  toMonth?: number;
  toYear?: number;
  year?: number;
  apartmentId?: string;
}
