import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import type { PaginatedResponse } from '../../api/types';

// Delta/auto-refresh window (see requirements/auto_refresh.md) — an interval tick asks the
// backend for only records created/updated in the last 10 minutes instead of re-fetching every
// currently loaded page.
const AUTO_REFRESH_WINDOW_MS = 10 * 60 * 1000;

/**
 * Merges a small delta (see requirements/auto_refresh.md) into an infinite query's cached pages:
 * matching ids are updated in place wherever they currently live (across any page, never
 * duplicated), and genuinely new ids are prepended to the first page with its `total`
 * incremented by exactly the new count. Pagination on later pages (`page`/`pageSize`/`total`) is
 * left untouched, so `getNextPageParam` — which reads only the *last* page — keeps working.
 * Exported standalone (pure, no timers/React) so it can be unit tested directly.
 */
export function mergeDeltaIntoInfinitePages<T extends { id: string }>(
  pages: readonly PaginatedResponse<T>[],
  delta: readonly T[]
): PaginatedResponse<T>[] {
  if (delta.length === 0 || pages.length === 0) return pages.slice();

  const deltaById = new Map(delta.map((item) => [item.id, item]));
  const seenIds = new Set<string>();
  const updatedPages = pages.map((page) => ({
    ...page,
    items: page.items.map((item) => {
      const updated = deltaById.get(item.id);
      if (updated) seenIds.add(item.id);
      return updated ?? item;
    }),
  }));

  const newItems = delta.filter((item) => !seenIds.has(item.id));
  if (newItems.length === 0) return updatedPages;

  const [firstPage, ...restPages] = updatedPages;
  return [
    { ...firstPage, items: [...newItems, ...firstPage.items], total: firstPage.total + newItems.length },
    ...restPages,
  ];
}

interface UseInfiniteListOptions<T extends { id: string }> {
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>;
  staleTime?: number;
  enabled?: boolean;
  /**
   * Delta/auto-refresh mode (see requirements/auto_refresh.md). When provided together with
   * `refetchIntervalMs`, an interval calls this with an ISO-8601 "10 minutes ago" timestamp and
   * merges the (small) result into whatever pages are already cached via
   * {@link mergeDeltaIntoInfinitePages}, instead of TanStack's native refetchInterval, which
   * would re-fetch every loaded page in full.
   */
  fetchDelta?: (updatedSince: string) => Promise<T[]>;
  /** Interval (ms) for `fetchDelta`. Ignored when `fetchDelta` is not provided. */
  refetchIntervalMs?: number | false;
}

interface UseInfiniteListReturn<T> {
  data: T[];
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  refetch: () => Promise<unknown>;
}

export function useInfiniteList<T extends { id: string }>({
  queryKey,
  fetchPage,
  staleTime,
  enabled = true,
  fetchDelta,
  refetchIntervalMs,
}: UseInfiniteListOptions<T>): UseInfiniteListReturn<T> {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam as number),
    getNextPageParam: (lastPage: PaginatedResponse<T>) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.pageSize);
      if (lastPage.page < totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1 as number,
    staleTime,
    enabled,
  });

  useEffect(() => {
    if (!fetchDelta || !refetchIntervalMs || !enabled) return undefined;

    const id = setInterval(() => {
      const updatedSince = new Date(Date.now() - AUTO_REFRESH_WINDOW_MS).toISOString();
      void fetchDelta(updatedSince).then((delta) => {
        if (delta.length === 0) return;
        queryClient.setQueryData<InfiniteData<PaginatedResponse<T>>>(queryKey, (old) =>
          old ? { ...old, pages: mergeDeltaIntoInfinitePages(old.pages, delta) } : old
        );
      });
    }, refetchIntervalMs);

    return () => clearInterval(id);
  }, [fetchDelta, refetchIntervalMs, enabled, queryClient, queryKey]);

  return {
    data: query.data?.pages.flatMap((p) => p.items) ?? [],
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}
