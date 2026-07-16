import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { residentsApi } from '../../../api/endpoints/residents';
import { usersApi, type RegisterUserRequest } from '../../../api/endpoints/users';
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

function invalidateResidents(queryClient: ReturnType<typeof useQueryClient>, societyId: string): void {
  void queryClient.invalidateQueries({ queryKey: ['residents', societyId] });
  void queryClient.invalidateQueries({ queryKey: ['pending-join-requests', societyId] });
}

export function useCreateResident(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterUserRequest) => usersApi.register(societyId, data),
    onSuccess: () => invalidateResidents(queryClient, societyId),
  });
}

export function useSetResidentActive(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? usersApi.activate(societyId, id) : usersApi.deactivate(societyId, id),
    onSuccess: () => invalidateResidents(queryClient, societyId),
  });
}

/** Apartment-join requests awaiting SUAdmin approval. */
export function usePendingJoinRequests(societyId: string, enabled = true) {
  return useQuery({
    queryKey: ['pending-join-requests', societyId],
    queryFn: () => usersApi.getPendingJoinRequests(societyId),
    enabled: !!societyId && enabled,
  });
}

export function useRespondToJoinRequest(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, approve }: { userId: string; approve: boolean }) =>
      approve ? usersApi.approveApartmentJoin(societyId, userId) : usersApi.denyApartmentJoin(societyId, userId),
    onSuccess: () => invalidateResidents(queryClient, societyId),
  });
}

export function useShareInviteLink(societyId: string) {
  return useMutation({
    mutationFn: ({ email, apartmentId }: { email: string; apartmentId?: string }) =>
      usersApi.shareInviteLink(societyId, email, apartmentId),
  });
}
