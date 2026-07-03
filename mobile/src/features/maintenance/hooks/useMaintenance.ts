import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { maintenanceApi } from '../../../api/endpoints/maintenance';
import type { MaintenanceCharge } from '../../../api/types';

export function useMaintenanceList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<MaintenanceCharge>({
    queryKey: ['maintenance', societyId, params],
    fetchPage: (page) =>
      maintenanceApi.getMaintenanceCharges(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useMaintenanceCharge(societyId: string, id: string) {
  return useQuery({
    queryKey: ['maintenance-charge', societyId, id],
    queryFn: () => maintenanceApi.getCharge(societyId, id),
    enabled: !!societyId && !!id,
  });
}

export function useSubmitPaymentProof(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proofUrl }: { id: string; proofUrl: string }) =>
      maintenanceApi.submitPaymentProof(societyId, id, proofUrl),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', societyId] });
    },
  });
}
