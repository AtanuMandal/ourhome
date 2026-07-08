import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { PaginatedResponse } from '../../api/types';

interface UseInfiniteListOptions<T> {
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>;
  staleTime?: number;
  enabled?: boolean;
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
