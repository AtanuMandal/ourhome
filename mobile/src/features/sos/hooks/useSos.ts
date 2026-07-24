import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { sosApi, TriggerSosAlertRequest } from '../../../api/endpoints/sos';
import type { SosAlert, SosAlertStatus, SosCategory } from '../../../api/types';

export function useSosAlertList(
  societyId: string,
  filters?: { status?: SosAlertStatus; category?: SosCategory; fromDate?: string; toDate?: string }
) {
  return useInfiniteList<SosAlert>({
    queryKey: ['sos-alerts', societyId, filters],
    fetchPage: (page) => sosApi.getAlerts(societyId, { ...filters, page, pageSize: 50 }),
    enabled: !!societyId,
  });
}

export function useSosAlert(
  societyId: string,
  id: string,
  options?: { refetchInterval?: UseQueryOptions<SosAlert>['refetchInterval'] }
) {
  return useQuery({
    queryKey: ['sos-alert', societyId, id],
    queryFn: () => sosApi.getAlert(societyId, id),
    enabled: !!societyId && !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useSosAlertReport(societyId: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['sos-alert-report', societyId, fromDate, toDate],
    queryFn: () => sosApi.getReport(societyId, fromDate, toDate),
    enabled: !!societyId,
  });
}

function invalidateSosQueries(queryClient: ReturnType<typeof useQueryClient>, societyId: string) {
  void queryClient.invalidateQueries({ queryKey: ['sos-alerts', societyId] });
}

/**
 * Status mutations must also update the single-alert cache entry (keyed
 * 'sos-alert', not 'sos-alerts') — otherwise the SOS trigger card keeps polling
 * a stale "Triggered" status and offers the False Alarm button again, and the
 * repeat tap surfaces an "already settled" error even though the first tap worked.
 */
function applyAlertUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  societyId: string,
  alert: SosAlert
) {
  queryClient.setQueryData(['sos-alert', societyId, alert.id], alert);
  invalidateSosQueries(queryClient, societyId);
}

export function useTriggerSosAlert(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TriggerSosAlertRequest) => sosApi.trigger(societyId, data),
    onSuccess: () => invalidateSosQueries(queryClient, societyId),
  });
}

export function useAcknowledgeSosAlert(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sosApi.acknowledge(societyId, id),
    onSuccess: (alert) => applyAlertUpdate(queryClient, societyId, alert),
  });
}

export function useResolveSosAlert(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sosApi.resolve(societyId, id),
    onSuccess: (alert) => applyAlertUpdate(queryClient, societyId, alert),
  });
}

export function useMarkSosAlertFalseAlarm(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sosApi.markFalseAlarm(societyId, id),
    onSuccess: (alert) => applyAlertUpdate(queryClient, societyId, alert),
  });
}
