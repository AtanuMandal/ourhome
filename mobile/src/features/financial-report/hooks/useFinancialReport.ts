import { useQuery } from '@tanstack/react-query';
import { financialReportApi } from '../../../api/endpoints/financial-report';

export function useFinancialSummary(societyId: string, year: number) {
  return useQuery({
    queryKey: ['financial-summary', societyId, year],
    queryFn: () => financialReportApi.getFinancialSummary(societyId, year),
    enabled: !!societyId,
  });
}

export function useIncomeBreakdown(societyId: string, year: number) {
  return useQuery({
    queryKey: ['income-breakdown', societyId, year],
    queryFn: () => financialReportApi.getIncomeBreakdown(societyId, year),
    enabled: !!societyId,
  });
}
