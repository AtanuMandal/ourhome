import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAgmSessionList, useAgmSession, useCreateAgmSession } from '../../../src/features/polls/hooks/useAgmSessions';
import type { AgmSessionDetail, AgmSessionSummary, PaginatedResponse } from '../../../src/api/types';

const mockGetSessions = jest.fn<Promise<PaginatedResponse<AgmSessionSummary>>, unknown[]>();
const mockGetSession = jest.fn<Promise<AgmSessionDetail>, unknown[]>();
const mockCreate = jest.fn<Promise<AgmSessionSummary>, unknown[]>();

jest.mock('../../../src/api/endpoints/agmSession', () => ({
  agmSessionApi: {
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    getSession: (...args: unknown[]) => mockGetSession(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAgmSessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useAgmSessionList returns the flat session list', async () => {
    mockGetSessions.mockResolvedValue({
      items: [
        { id: '1', title: 'AGM 2025', sessionDate: '2025-04-01T00:00:00Z', resolutionCount: 2 },
        { id: '2', title: 'AGM 2026', sessionDate: '2026-04-01T00:00:00Z', resolutionCount: 3 },
      ],
      total: 2, page: 1, pageSize: 50,
    });

    const { result } = renderHook(() => useAgmSessionList('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  test('useAgmSession returns the session detail with resolutions', async () => {
    mockGetSession.mockResolvedValue({
      id: 's1', societyId: 'soc1', title: 'AGM 2026', description: 'desc', sessionDate: '2026-04-01T00:00:00Z',
      createdByUserId: 'admin1', createdAt: '2026-01-01T00:00:00Z', resolutions: [],
    });

    const { result } = renderHook(() => useAgmSession('soc1', 's1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('AGM 2026');
  });

  test('useCreateAgmSession resolves on success', async () => {
    mockCreate.mockResolvedValue({ id: 's1', title: 'AGM 2026', sessionDate: '2026-04-01T00:00:00Z', resolutionCount: 0 });

    const { result } = renderHook(() => useCreateAgmSession('soc1'), { wrapper: createWrapper() });
    result.current.mutate({ title: 'AGM 2026', description: 'desc', sessionDate: '2026-04-01T00:00:00Z' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith('soc1', { title: 'AGM 2026', description: 'desc', sessionDate: '2026-04-01T00:00:00Z' });
  });
});
