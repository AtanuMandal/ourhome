import api from '../client';

// Matches backend SocietySummaryDto
export interface SocietySummaryDto {
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
  expenseBreakdownYtd: ExpenseCategoryDto[];
}

export interface ExpenseCategoryDto {
  category: string;
  amount: number;
  percentageOfTotal: number;
}

// Matches backend PersonalStatementDto
export interface PersonalStatementDto {
  apartmentId: string;
  apartmentLabel: string;
  year: number;
  totalCharged: number;
  totalPaid: number;
  totalOutstanding: number;
  charges: PersonalChargeDto[];
}

export interface PersonalChargeDto {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  status: string;
  submittedOn?: string;
  approvedOn?: string;
  paymentMethod?: string;
  receiptUrl?: string;
}

// Matches backend FinancialDashboardDto (SUAdmin / HQ only)
export interface FinancialDashboardDto {
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
  topOverdueApartments: { apartmentId: string; apartmentLabel: string; overdueAmount: number; daysOverdue: number }[];
  upcomingVendorDues: { vendorId: string; vendorName: string; amount: number; dueDate: string; daysUntilDue: number }[];
}

export const financialReportApi = {
  // Available to all roles — shows current month + YTD summary
  getSocietySummary: (societyId: string) =>
    api
      .get<SocietySummaryDto>(`/societies/${societyId}/financial-report/society-summary`)
      .then((r) => r.data),

  // SUAdmin / HQ only — full financial dashboard for current month
  getDashboard: (societyId: string) =>
    api
      .get<FinancialDashboardDto>(`/societies/${societyId}/financial-report/dashboard`)
      .then((r) => r.data),

  // SUUser / SUAdmin — personal payment statement for a given year
  getPersonalStatement: (societyId: string, apartmentId: string, year?: number) =>
    api
      .get<PersonalStatementDto>(
        `/societies/${societyId}/apartments/${apartmentId}/financial-report/statement`,
        { params: year ? { year } : undefined }
      )
      .then((r) => r.data),
};
