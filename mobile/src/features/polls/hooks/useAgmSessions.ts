import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { agmSessionApi, CreateAgmSessionRequest } from '../../../api/endpoints/agmSession';
import type { AgmSessionSummary } from '../../../api/types';

export function useAgmSessionList(societyId: string) {
  return useInfiniteList<AgmSessionSummary>({
    queryKey: ['agm-sessions', societyId],
    fetchPage: (page) => agmSessionApi.getSessions(societyId, { page, pageSize: 50 }),
    enabled: !!societyId,
  });
}

export function useAgmSession(societyId: string, id: string) {
  return useQuery({
    queryKey: ['agm-session', societyId, id],
    queryFn: () => agmSessionApi.getSession(societyId, id),
    enabled: !!societyId && !!id,
  });
}

export function useCreateAgmSession(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgmSessionRequest) => agmSessionApi.create(societyId, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['agm-sessions', societyId] }),
  });
}
