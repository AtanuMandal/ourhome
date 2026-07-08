import { useQuery } from '@tanstack/react-query';
import { financialReportApi } from '../../../api/endpoints/financial-report';

export function useFinancialSocietySummary(societyId: string) {
  return useQuery({
    queryKey: ['financial-society-summary', societyId],
    queryFn: () => financialReportApi.getSocietySummary(societyId),
    enabled: !!societyId,
  });
}

export function useFinancialDashboard(societyId: string) {
  return useQuery({
    queryKey: ['financial-dashboard', societyId],
    queryFn: () => financialReportApi.getDashboard(societyId),
    enabled: !!societyId,
  });
}

export function usePersonalStatement(societyId: string, apartmentId: string, year?: number) {
  return useQuery({
    queryKey: ['personal-statement', societyId, apartmentId, year],
    queryFn: () => financialReportApi.getPersonalStatement(societyId, apartmentId, year),
    enabled: !!societyId && !!apartmentId,
  });
}

export function useSocietyLedger(societyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['society-ledger', societyId],
    queryFn: () => financialReportApi.getSocietyLedger(societyId),
    enabled: !!societyId && enabled,
  });
}
