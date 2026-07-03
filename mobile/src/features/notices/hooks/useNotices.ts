import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { noticesApi } from '../../../api/endpoints/notices';
import type { Notice } from '../../../api/types';

export function useNoticeList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<Notice>({
    queryKey: ['notices', societyId, params],
    fetchPage: (page) =>
      noticesApi.getNotices(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useNotice(societyId: string, id: string) {
  return useQuery({
    queryKey: ['notice', societyId, id],
    queryFn: () => noticesApi.getNotice(societyId, id),
    enabled: !!societyId && !!id,
  });
}

export function useMarkNoticeRead(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noticesApi.markNoticeRead(societyId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notices', societyId] });
    },
  });
}
