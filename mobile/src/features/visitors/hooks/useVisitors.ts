import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { visitorsApi, type RegisterVisitorRequest } from '../../../api/endpoints/visitors';
import type { Visitor } from '../../../api/types';

export function useVisitorList(
  societyId: string,
  params?: Record<string, string | number>,
  enabled = true
) {
  return useInfiniteList<Visitor>({
    queryKey: ['visitors', societyId, params],
    fetchPage: (page) =>
      visitorsApi.getVisitors(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId && enabled,
  });
}

/** No filter applied — all Pending visitors plus the 10 most recent overall, not the whole history. */
export function useVisitorDefaultView(societyId: string, enabled = true) {
  return useQuery({
    queryKey: ['visitors-default', societyId],
    queryFn: async () => {
      const [pendingRes, recentRes] = await Promise.all([
        visitorsApi.getVisitors(societyId, { status: 'Pending', page: 1, pageSize: 200 }),
        visitorsApi.getVisitors(societyId, { page: 1, pageSize: 10 }),
      ]);
      const merged = new Map<string, Visitor>();
      for (const visitor of pendingRes.items) merged.set(visitor.id, visitor);
      for (const visitor of recentRes.items) if (!merged.has(visitor.id)) merged.set(visitor.id, visitor);
      return [...merged.values()];
    },
    enabled: !!societyId && enabled,
  });
}

export function useVisitor(societyId: string, id: string) {
  return useQuery({
    queryKey: ['visitor', societyId, id],
    queryFn: () => visitorsApi.getVisitor(societyId, id),
    enabled: !!societyId && !!id,
  });
}

export function useVisitorLookups(societyId: string) {
  return useQuery({
    queryKey: ['visitor-lookups', societyId],
    queryFn: () => visitorsApi.getLookups(societyId),
    enabled: !!societyId,
  });
}

function invalidateVisitorLists(queryClient: ReturnType<typeof useQueryClient>, societyId: string) {
  void queryClient.invalidateQueries({ queryKey: ['visitors', societyId] });
  void queryClient.invalidateQueries({ queryKey: ['visitors-default', societyId] });
}

export function useRegisterVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterVisitorRequest) =>
      visitorsApi.registerVisitor(societyId, data),
    onSuccess: () => invalidateVisitorLists(queryClient, societyId),
  });
}

export function useApproveVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.approveVisitor(societyId, id),
    onSuccess: () => invalidateVisitorLists(queryClient, societyId),
  });
}

export function useDenyVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.denyVisitor(societyId, id),
    onSuccess: () => invalidateVisitorLists(queryClient, societyId),
  });
}

export function useCheckOutVisitor(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorsApi.checkOutVisitor(societyId, id),
    onSuccess: () => invalidateVisitorLists(queryClient, societyId),
  });
}
