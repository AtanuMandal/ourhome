import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { maintenanceApi } from '../../../api/endpoints/maintenance';
import type { MaintenanceCharge } from '../../../api/types';

export function useMaintenanceList(
  societyId: string,
  params?: Record<string, string | number>,
  enabled = true
) {
  return useInfiniteList<MaintenanceCharge>({
    queryKey: ['maintenance', societyId, params],
    fetchPage: (page) =>
      maintenanceApi.getMaintenanceCharges(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId && enabled,
    // Silently refresh every 10s so a resident's (re)submitted proof, or an admin's approve/deny,
    // shows up on the other party's already-open screen without a manual pull-to-refresh —
    // matches the visitor list's pattern. Delta/auto-refresh mode (see
    // requirements/auto_refresh.md): fetches only charges changed in the window and merges them
    // into the cached pages instead of re-fetching every loaded page. Disabled under Jest to
    // avoid leaking open timers.
    fetchDelta: (updatedSince) =>
      maintenanceApi
        .getMaintenanceCharges(societyId, { ...params, updatedSince })
        .then((r) => r.items),
    refetchIntervalMs: process.env.NODE_ENV === 'test' ? false : 10_000,
  });
}

export function useSubmitPaymentProof(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chargeIds, proofUrl, notes }: { chargeIds: string[]; proofUrl: string; notes?: string }) =>
      maintenanceApi.submitPaymentProof(societyId, chargeIds, proofUrl, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['maintenance', societyId] });
    },
  });
}
