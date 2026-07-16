import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import {
  vendorPaymentsApi,
  type VendorCharge,
  type MarkVendorChargePaidRequest,
} from '../../../api/endpoints/vendor-payments';

export function useVendorChargeList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<VendorCharge>({
    queryKey: ['vendor-charges', societyId, params],
    fetchPage: (page) =>
      vendorPaymentsApi.getVendorCharges(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

function useInvalidateVendorCharges(societyId: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['vendor-charges', societyId] });
}

export function useMarkVendorChargePaid(societyId: string) {
  const invalidate = useInvalidateVendorCharges(societyId);
  return useMutation({
    mutationFn: ({ chargeId, data }: { chargeId: string; data: MarkVendorChargePaidRequest }) =>
      vendorPaymentsApi.markPaid(societyId, chargeId, data),
    onSuccess: invalidate,
  });
}

export function useSetVendorChargeActive(societyId: string) {
  const invalidate = useInvalidateVendorCharges(societyId);
  return useMutation({
    mutationFn: ({ chargeId, active }: { chargeId: string; active: boolean }) =>
      active
        ? vendorPaymentsApi.activateCharge(societyId, chargeId)
        : vendorPaymentsApi.inactivateCharge(societyId, chargeId),
    onSuccess: invalidate,
  });
}

export function useDeleteVendorCharge(societyId: string) {
  const invalidate = useInvalidateVendorCharges(societyId);
  return useMutation({
    mutationFn: (chargeId: string) => vendorPaymentsApi.deleteCharge(societyId, chargeId),
    onSuccess: invalidate,
  });
}
