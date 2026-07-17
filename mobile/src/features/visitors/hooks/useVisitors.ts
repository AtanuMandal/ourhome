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

/**
 * No filter applied — all Pending and CheckedIn visitors plus the 10 most recent concluded
 * entries, not the whole history. Checked-in visitors are on the premises right now, so they
 * must always be visible for security to check out on exit — they never age out of this view.
 * The backend computes the whole view in a single call.
 */
export function useVisitorDefaultView(societyId: string, enabled = true) {
  return useQuery({
    queryKey: ['visitors-default', societyId],
    queryFn: () => visitorsApi.getDefaultView(societyId, 10),
    enabled: !!societyId && enabled,
    // Near-realtime gate view: silently refresh every 10s (matches the web app). TanStack
    // keeps showing the previous data during the background fetch, so nothing flickers.
    // Disabled under Jest — the interval would hold the worker process open after tests end.
    refetchInterval: process.env.NODE_ENV === 'test' ? false : 10_000,
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
  // The detail/pass screen caches a single visitor — refresh it too after any status change.
  void queryClient.invalidateQueries({ queryKey: ['visitor', societyId] });
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

/** Gate flow: verifying a pass code checks the visitor in as one step. */
export function useCheckInVisitorByPass(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (passCode: string) => visitorsApi.checkInVisitorByPass(societyId, passCode),
    onSuccess: () => invalidateVisitorLists(queryClient, societyId),
  });
}
