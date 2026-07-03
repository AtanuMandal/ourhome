import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { complaintsApi } from '../../../api/endpoints/complaints';
import type { Complaint } from '../../../api/types';

export function useComplaintList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<Complaint>({
    queryKey: ['complaints', societyId, params],
    fetchPage: (page) =>
      complaintsApi.getComplaints(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useCreateComplaint(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Complaint>) =>
      complaintsApi.createComplaint(societyId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['complaints', societyId] });
    },
  });
}

export function useUpdateComplaintStatus(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      complaintsApi.updateComplaintStatus(societyId, id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['complaints', societyId] });
    },
  });
}
