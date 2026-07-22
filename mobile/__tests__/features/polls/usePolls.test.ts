import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  usePollList,
  useCreatePoll,
  useCastVote,
  useClosePoll,
  usePublishPollResults,
  useSocietyBlockNames,
} from '../../../src/features/polls/hooks/usePolls';
import type { Apartment, PaginatedResponse, Poll, PollSummary, PollVoteResult } from '../../../src/api/types';

const mockGetPolls = jest.fn<Promise<PaginatedResponse<PollSummary>>, unknown[]>();
const mockCreate = jest.fn<Promise<Poll>, unknown[]>();
const mockVote = jest.fn<Promise<PollVoteResult>, unknown[]>();
const mockClose = jest.fn<Promise<Poll>, unknown[]>();
const mockPublishResults = jest.fn<Promise<Poll>, unknown[]>();
const mockGetApartments = jest.fn<Promise<PaginatedResponse<Apartment>>, unknown[]>();

jest.mock('../../../src/api/endpoints/poll', () => ({
  pollApi: {
    getPolls: (...args: unknown[]) => mockGetPolls(...args),
    getPoll: jest.fn(),
    create: (...args: unknown[]) => mockCreate(...args),
    vote: (...args: unknown[]) => mockVote(...args),
    close: (...args: unknown[]) => mockClose(...args),
    publishResults: (...args: unknown[]) => mockPublishResults(...args),
  },
}));

jest.mock('../../../src/api/endpoints/apartments', () => ({
  apartmentsApi: {
    getApartments: (...args: unknown[]) => mockGetApartments(...args),
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

function makeSummary(overrides: Partial<PollSummary> = {}): PollSummary {
  return {
    id: overrides.id ?? 'p1',
    tt: 'Repaint the gate?',
    ty: 'SingleChoice',
    ca: '2026-01-10T00:00:00Z',
    st: 'Open',
    agm: false,
    ...overrides,
  };
}

function makePoll(): Poll {
  return {
    id: 'p1', tt: 'Repaint the gate?', ds: 'desc',
    ty: 'SingleChoice', op: [{ id: 'o1', tx: 'Yes' }, { id: 'o2', tx: 'No' }],
    oa: '2026-01-01T00:00:00Z', ca: '2026-01-10T00:00:00Z',
    ta: 'FullSociety', tbn: [],
    agm: false, avc: true, st: 'Open',
    rp: false,
    hv: false,
  };
}

describe('usePolls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('usePollList returns the flat poll list', async () => {
    mockGetPolls.mockResolvedValue({ items: [makeSummary({ id: '1' }), makeSummary({ id: '2' })], total: 2, page: 1, pageSize: 50 });

    const { result } = renderHook(() => usePollList('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  test('useCreatePoll resolves on success', async () => {
    mockCreate.mockResolvedValue(makePoll());

    const { result } = renderHook(() => useCreatePoll('soc1'), { wrapper: createWrapper() });
    result.current.mutate({
      title: 'Repaint the gate?', description: '', type: 'SingleChoice', options: ['Yes', 'No'],
      opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z',
      targetAudience: 'FullSociety',
      eligibilityUnit: 'PerResident', anonymity: 'Anonymous', visibility: 'Immediately',
      isAgmResolution: false, allowVoteChange: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith('soc1', expect.objectContaining({ title: 'Repaint the gate?' }));
  });

  test('useCastVote resolves on success', async () => {
    mockVote.mockResolvedValue({ pid: 'p1', so: ['o1'], va: '2026-01-01T00:00:00Z' });

    const { result } = renderHook(() => useCastVote('soc1', 'p1'), { wrapper: createWrapper() });
    result.current.mutate({ selectedOptionIds: ['o1'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockVote).toHaveBeenCalledWith('soc1', 'p1', { selectedOptionIds: ['o1'] });
  });

  test('useClosePoll resolves on success', async () => {
    mockClose.mockResolvedValue(makePoll());

    const { result } = renderHook(() => useClosePoll('soc1'), { wrapper: createWrapper() });
    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClose).toHaveBeenCalledWith('soc1', 'p1');
  });

  test('usePublishPollResults surfaces the backend error on failure', async () => {
    mockPublishResults.mockRejectedValue({ response: { data: { error: 'Results already published.' } } });

    const { result } = renderHook(() => usePublishPollResults('soc1'), { wrapper: createWrapper() });
    result.current.mutate('p1');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  test('useSocietyBlockNames returns distinct sorted block names', async () => {
    mockGetApartments.mockResolvedValue({
      items: [
        { blk: 'Block B' } as Apartment,
        { blk: 'Block A' } as Apartment,
        { blk: 'Block A' } as Apartment,
      ],
      total: 3, page: 1, pageSize: 500,
    });

    const { result } = renderHook(() => useSocietyBlockNames('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['Block A', 'Block B']);
  });
});
