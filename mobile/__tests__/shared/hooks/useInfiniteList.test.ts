import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInfiniteList, mergeDeltaIntoInfinitePages } from '../../../src/shared/hooks/useInfiniteList';
import type { PaginatedResponse } from '../../../src/api/types';

interface Item {
  id: string;
  value: string;
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function page(items: Item[], overrides: Partial<PaginatedResponse<Item>> = {}): PaginatedResponse<Item> {
  return { items, total: items.length, page: 1, pageSize: 20, ...overrides };
}

describe('useInfiniteList', () => {
  test('flattens fetched pages into a single data array', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page([{ id: '1', value: 'a' }]));

    const { result } = renderHook(
      () => useInfiniteList<Item>({ queryKey: ['test-list-basic'], fetchPage }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([{ id: '1', value: 'a' }]);
    expect(result.current.hasNextPage).toBe(false);
  });

  test('fetchDelta is never called when refetchIntervalMs is not provided', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page([{ id: '1', value: 'a' }]));
    const fetchDelta = jest.fn().mockResolvedValue([{ id: '2', value: 'new' }]);

    renderHook(
      () => useInfiniteList<Item>({ queryKey: ['test-list-no-interval'], fetchPage, fetchDelta }),
      { wrapper: createWrapper() }
    );

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchDelta).not.toHaveBeenCalled();
  });
});

// The interval wiring above only ever calls mergeDeltaIntoInfinitePages — this is where the
// actual merge behavior lives, and it's exercised directly here rather than through a real timer
// (fast, deterministic, no async/interval flakiness).
describe('mergeDeltaIntoInfinitePages', () => {
  test('updates an existing record in place, wherever it currently lives, without touching total', () => {
    const pages = [
      page([{ id: '1', value: 'original' }, { id: '2', value: 'b' }], { total: 2 }),
    ];
    const delta: Item[] = [{ id: '1', value: 'updated' }];

    const merged = mergeDeltaIntoInfinitePages(pages, delta);

    expect(merged[0].items).toEqual([
      { id: '1', value: 'updated' },
      { id: '2', value: 'b' },
    ]);
    expect(merged[0].total).toBe(2);
  });

  test('prepends a genuinely new record to the first page and increments its total', () => {
    const pages = [page([{ id: '1', value: 'a' }], { total: 1 })];
    const delta: Item[] = [{ id: '2', value: 'new' }];

    const merged = mergeDeltaIntoInfinitePages(pages, delta);

    expect(merged[0].items.map((i) => i.id)).toEqual(['2', '1']);
    expect(merged[0].total).toBe(2);
  });

  test('updates a record on a later page in place instead of duplicating it onto the first page', () => {
    const pages = [
      page([{ id: '1', value: 'a' }], { total: 2, page: 1 }),
      page([{ id: '2', value: 'original' }], { total: 2, page: 2 }),
    ];
    const delta: Item[] = [{ id: '2', value: 'updated' }];

    const merged = mergeDeltaIntoInfinitePages(pages, delta);

    expect(merged[0].items).toEqual([{ id: '1', value: 'a' }]);
    expect(merged[1].items).toEqual([{ id: '2', value: 'updated' }]);
    // No page's total changes — nothing new arrived, only an update.
    expect(merged[0].total).toBe(2);
    expect(merged[1].total).toBe(2);
  });

  test('leaves later pages (page/pageSize/total) untouched so pagination keeps working', () => {
    const pages = [
      page([{ id: '1', value: 'a' }], { total: 3, page: 1, pageSize: 1 }),
      page([{ id: '2', value: 'b' }], { total: 3, page: 2, pageSize: 1 }),
    ];
    const delta: Item[] = [{ id: '3', value: 'new' }];

    const merged = mergeDeltaIntoInfinitePages(pages, delta);

    expect(merged[1]).toEqual(pages[1]);
  });

  test('returns the pages unchanged (by value) when the delta is empty', () => {
    const pages = [page([{ id: '1', value: 'a' }])];

    const merged = mergeDeltaIntoInfinitePages(pages, []);

    expect(merged).toEqual(pages);
  });

  test('returns an empty array unchanged when there are no cached pages yet', () => {
    const merged = mergeDeltaIntoInfinitePages([], [{ id: '1', value: 'a' }]);

    expect(merged).toEqual([]);
  });
});
