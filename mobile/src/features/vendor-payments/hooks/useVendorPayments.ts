import { useQuery } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { vendorPaymentsApi, type VendorPayment } from '../../../api/endpoints/vendor-payments';

export function useVendorPaymentList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<VendorPayment>({
    queryKey: ['vendor-payments', societyId, params],
    fetchPage: (page) =>
      vendorPaymentsApi.getVendorPayments(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useVendorPayment(societyId: string, id: string) {
  return useQuery({
    queryKey: ['vendor-payment', societyId, id],
    queryFn: () => vendorPaymentsApi.getVendorPayment(societyId, id),
    enabled: !!societyId && !!id,
  });
}
