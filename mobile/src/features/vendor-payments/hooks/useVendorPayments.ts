import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { vendorPaymentsApi, type VendorCharge } from '../../../api/endpoints/vendor-payments';

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
