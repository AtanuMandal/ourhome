import api from '../client';

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  year: number;
}

export interface IncomeBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export const financialReportApi = {
  getFinancialSummary: (societyId: string, year: number) =>
    api
      .get<FinancialSummary>(
        `/societies/${societyId}/financial-reports/summary`,
        { params: { year } }
      )
      .then((r) => r.data),

  getIncomeBreakdown: (societyId: string, year: number) =>
    api
      .get<IncomeBreakdown[]>(
        `/societies/${societyId}/financial-reports/income-breakdown`,
        { params: { year } }
      )
      .then((r) => r.data),
};
