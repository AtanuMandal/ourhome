import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { complaintsApi, type ResolveComplaintRequest } from '../../../api/endpoints/complaints';
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

export function useComplaint(societyId: string, id: string) {
  return useQuery({
    queryKey: ['complaint', societyId, id],
    queryFn: () => complaintsApi.getComplaint(societyId, id),
    enabled: !!societyId && !!id,
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

export function useResolveComplaint(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ResolveComplaintRequest) =>
      complaintsApi.resolveComplaint(societyId, id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['complaints', societyId] });
    },
  });
}
