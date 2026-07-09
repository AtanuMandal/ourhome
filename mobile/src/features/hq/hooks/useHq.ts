import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { societyApi, CreateSocietyRequest, UpdateSocietyRequest } from '../../../api/endpoints/society';
import { hqUserApi, CreateHqUserRequest } from '../../../api/endpoints/hqUser';

export function useHqSocieties() {
  return useQuery({
    queryKey: ['hq-societies'],
    queryFn: () => societyApi.listSocieties({ page: 1, pageSize: 100 }),
  });
}

export function useHqSociety(societyId: string) {
  return useQuery({
    queryKey: ['hq-society', societyId],
    queryFn: () => societyApi.getSociety(societyId),
    enabled: !!societyId,
  });
}

export function useCreateSociety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSocietyRequest) => societyApi.createSociety(data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hq-societies'] }),
  });
}

export function useUpdateSociety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ societyId, data }: { societyId: string; data: UpdateSocietyRequest }) =>
      societyApi.updateSociety(societyId, data),
    onSuccess: (_data, { societyId }) => {
      void queryClient.invalidateQueries({ queryKey: ['hq-societies'] });
      void queryClient.invalidateQueries({ queryKey: ['hq-society', societyId] });
    },
  });
}

export function useHqSocietyReport(societyId: string) {
  return useQuery({
    queryKey: ['hq-society-report', societyId],
    queryFn: () => societyApi.getSummaryReport(societyId),
    enabled: !!societyId,
  });
}

export function useActivateSociety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (societyId: string) => societyApi.activateSociety(societyId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hq-societies'] }),
  });
}

export function useDeactivateSociety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (societyId: string) => societyApi.deactivateSociety(societyId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hq-societies'] }),
  });
}

export function useHqUsers() {
  return useQuery({
    queryKey: ['hq-users'],
    queryFn: () => hqUserApi.listHqUsers({ page: 1, pageSize: 100 }),
  });
}

function invalidateHqUsers(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['hq-users'] });
}

export function useCreateHqUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHqUserRequest) => hqUserApi.createHqUser(data),
    onSuccess: () => invalidateHqUsers(queryClient),
  });
}

export function useActivateHqUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hqUserApi.activateHqUser(id),
    onSuccess: () => invalidateHqUsers(queryClient),
  });
}

export function useDeactivateHqUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hqUserApi.deactivateHqUser(id),
    onSuccess: () => invalidateHqUsers(queryClient),
  });
}
