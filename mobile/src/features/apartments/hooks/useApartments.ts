import { useQuery } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { apartmentsApi } from '../../../api/endpoints/apartments';
import type { Apartment } from '../../../api/types';

export function useApartmentList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<Apartment>({
    queryKey: ['apartments', societyId, params],
    fetchPage: (page) =>
      apartmentsApi.getApartments(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useApartment(societyId: string, id: string) {
  return useQuery({
    queryKey: ['apartment', societyId, id],
    queryFn: () => apartmentsApi.getApartment(societyId, id),
    enabled: !!societyId && !!id,
  });
}
