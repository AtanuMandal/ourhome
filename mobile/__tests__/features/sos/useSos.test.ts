import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSosAlertList,
  useTriggerSosAlert,
  useAcknowledgeSosAlert,
  useResolveSosAlert,
  useMarkSosAlertFalseAlarm,
} from '../../../src/features/sos/hooks/useSos';
import type { PaginatedResponse, SosAlert } from '../../../src/api/types';

const mockGetAlerts = jest.fn<Promise<PaginatedResponse<SosAlert>>, unknown[]>();
const mockTrigger = jest.fn<Promise<SosAlert>, unknown[]>();
const mockAcknowledge = jest.fn<Promise<SosAlert>, unknown[]>();
const mockResolve = jest.fn<Promise<SosAlert>, unknown[]>();
const mockMarkFalseAlarm = jest.fn<Promise<SosAlert>, unknown[]>();

jest.mock('../../../src/api/endpoints/sos', () => ({
  sosApi: {
    getAlerts: (...args: unknown[]) => mockGetAlerts(...args),
    getAlert: jest.fn(),
    trigger: (...args: unknown[]) => mockTrigger(...args),
    acknowledge: (...args: unknown[]) => mockAcknowledge(...args),
    resolve: (...args: unknown[]) => mockResolve(...args),
    markFalseAlarm: (...args: unknown[]) => mockMarkFalseAlarm(...args),
    getReport: jest.fn(),
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

function makeAlert(overrides: Partial<SosAlert> = {}): SosAlert {
  return {
    id: overrides.id ?? 'a1',
    al: 'A-101',
    un: 'Jane Resident',
    cat: 'Fire',
    st: 'Triggered',
    ta: '2026-01-01T00:00:00Z',
    ec: 0,
    ...overrides,
  };
}

describe('useSos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useSosAlertList returns the flat alert list', async () => {
    mockGetAlerts.mockResolvedValue({
      items: [makeAlert({ id: '1' }), makeAlert({ id: '2', st: 'Resolved' })],
      total: 2,
      page: 1,
      pageSize: 50,
    });

    const { result } = renderHook(() => useSosAlertList('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  test('useTriggerSosAlert resolves on success', async () => {
    mockTrigger.mockResolvedValue(makeAlert());

    const { result } = renderHook(() => useTriggerSosAlert('soc1'), { wrapper: createWrapper() });

    result.current.mutate({ category: 'Fire', note: 'Smoke' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTrigger).toHaveBeenCalledWith('soc1', { category: 'Fire', note: 'Smoke' });
  });

  test('useAcknowledgeSosAlert resolves on success', async () => {
    mockAcknowledge.mockResolvedValue(makeAlert({ st: 'Acknowledged' }));

    const { result } = renderHook(() => useAcknowledgeSosAlert('soc1'), { wrapper: createWrapper() });

    result.current.mutate('a1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAcknowledge).toHaveBeenCalledWith('soc1', 'a1');
  });

  test('useResolveSosAlert resolves on success', async () => {
    mockResolve.mockResolvedValue(makeAlert({ st: 'Resolved' }));

    const { result } = renderHook(() => useResolveSosAlert('soc1'), { wrapper: createWrapper() });

    result.current.mutate('a1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockResolve).toHaveBeenCalledWith('soc1', 'a1');
  });

  test('useMarkSosAlertFalseAlarm surfaces the backend error on failure', async () => {
    mockMarkFalseAlarm.mockRejectedValue({ response: { data: { error: 'Only the triggering resident can do this.' } } });

    const { result } = renderHook(() => useMarkSosAlertFalseAlarm('soc1'), { wrapper: createWrapper() });

    result.current.mutate('a1');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
