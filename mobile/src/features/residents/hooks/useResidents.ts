import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { residentsApi } from '../../../api/endpoints/residents';
import type { User } from '../../../api/types';

export function useResidentList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<User>({
    queryKey: ['residents', societyId, params],
    fetchPage: (page) =>
      residentsApi.getResidents(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useResident(societyId: string, id: string) {
  return useQuery({
    queryKey: ['resident', societyId, id],
    queryFn: () => residentsApi.getResident(societyId, id),
    enabled: !!societyId && !!id,
  });
}

export function useDeleteResident(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => residentsApi.deleteResident(societyId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['residents', societyId] });
    },
  });
}
