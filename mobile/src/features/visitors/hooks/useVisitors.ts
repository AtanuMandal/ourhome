import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { visitorsApi, type RegisterVisitorRequest } from '../../../api/endpoints/visitors';
import type { Visitor } from '../../../api/types';

export function useVisitorList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<Visitor>({
    queryKey: ['visitors', societyId, params],
    fetchPage: (page) =>
      visitorsApi.getVisitors(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useVisitor(societyId: string, id: string) {
  return useQuery({
    queryKey: ['visitor', societyId, id],
    queryFn: () => visitorsApi.getVisitor(societyId, id),
    enabled: !!societyId && !!id,
  });
}

export function useRegisterVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterVisitorRequest) =>
      visitorsApi.registerVisitor(societyId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors', societyId] });
    },
  });
}

export function useApproveVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.approveVisitor(societyId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors', societyId] });
    },
  });
}

export function useDenyVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.denyVisitor(societyId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors', societyId] });
    },
  });
}

export function useCheckOutVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.checkOutVisitor(societyId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['visitors', societyId] });
    },
  });
}
