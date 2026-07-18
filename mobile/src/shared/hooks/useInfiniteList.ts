import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { PaginatedResponse } from '../../api/types';

interface UseInfiniteListOptions<T> {
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>;
  staleTime?: number;
  enabled?: boolean;
  /** Silently re-fetch all currently loaded pages on an interval (ms), or false to disable. */
  refetchInterval?: number | false;
}

interface UseInfiniteListReturn<T> {
  data: T[];
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  refetch: () => Promise<unknown>;
}

export function useInfiniteList<T>({
  queryKey,
  fetchPage,
  staleTime,
  enabled = true,
  refetchInterval,
}: UseInfiniteListOptions<T>): UseInfiniteListReturn<T> {
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
    refetchInterval,
  });

  return {
    data: query.data?.pages.flatMap((p) => p.items) ?? [],
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}
