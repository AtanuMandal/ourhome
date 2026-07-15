import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVisitorList, useVisitorDefaultView, useVisitorLookups } from '../../../src/features/visitors/hooks/useVisitors';
import type { PaginatedResponse } from '../../../src/api/types';
import type { Visitor } from '../../../src/api/types';

const mockGetVisitors = jest.fn<Promise<PaginatedResponse<Visitor>>, [string, (Record<string, string | number> | undefined)?]>();
const mockGetLookups = jest.fn();

jest.mock('../../../src/api/endpoints/visitors', () => ({
  visitorsApi: {
    getVisitors: (...args: [string, (Record<string, string | number> | undefined)?]) =>
      mockGetVisitors(...args),
    getVisitor: jest.fn(),
    registerVisitor: jest.fn(),
    approveVisitor: jest.fn(),
    denyVisitor: jest.fn(),
    checkOutVisitor: jest.fn(),
    getLookups: (...args: [string]) => mockGetLookups(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useVisitors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useVisitorList returns data successfully', async () => {
    const mockData: PaginatedResponse<Visitor> = {
      items: [
        {
          id: '1',
          societyId: 'soc1',
          residentId: 'res1',
          residentName: 'John Doe',
          visitorName: 'Jane Smith',
          visitorPhone: '9876543210',
          purpose: 'Guest visit',
          status: 'Approved',
          createdAt: '2024-01-15T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    mockGetVisitors.mockResolvedValue(mockData);

    const { result } = renderHook(() => useVisitorList('soc1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]?.visitorName).toBe('Jane Smith');
  });

  test('useVisitorList handles empty results', async () => {
    const mockData: PaginatedResponse<Visitor> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };

    mockGetVisitors.mockResolvedValue(mockData);

    const { result } = renderHook(() => useVisitorList('soc1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });

  test('useVisitorDefaultView merges pending and checked-in visitors with the 10 most recent, de-duplicated by id', async () => {
    const makeVisitor = (id: string, status: string): Visitor => ({
      id,
      societyId: 'soc1',
      residentId: 'res1',
      residentName: 'John Doe',
      visitorName: `Visitor ${id}`,
      visitorPhone: '9876543210',
      purpose: 'Guest visit',
      status: status as Visitor['status'],
      createdAt: '2024-01-15T10:00:00Z',
    });

    const pendingItems = [makeVisitor('p1', 'Pending'), makeVisitor('p2', 'Pending')];
    // Checked-in visitors are on the premises — always included so security can check them out.
    const checkedInItems = [makeVisitor('ci1', 'CheckedIn')];
    const recentItems = [makeVisitor('p1', 'Pending'), makeVisitor('c1', 'CheckedOut')];

    mockGetVisitors.mockImplementation((_societyId, params) => {
      if (params?.status === 'Pending') {
        return Promise.resolve({ items: pendingItems, total: 2, page: 1, pageSize: 200 });
      }
      if (params?.status === 'CheckedIn') {
        return Promise.resolve({ items: checkedInItems, total: 1, page: 1, pageSize: 200 });
      }
      return Promise.resolve({ items: recentItems, total: 2, page: 1, pageSize: 10 });
    });

    const { result } = renderHook(() => useVisitorDefaultView('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.map(v => v.id).sort()).toEqual(['c1', 'ci1', 'p1', 'p2']);
  });

  test('useVisitorLookups returns companies and purposes for the society', async () => {
    mockGetLookups.mockResolvedValue({ companies: ['Amazon'], purposes: ['Delivery'] });

    const { result } = renderHook(() => useVisitorLookups('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetLookups).toHaveBeenCalledWith('soc1');
    expect(result.current.data).toEqual({ companies: ['Amazon'], purposes: ['Delivery'] });
  });
});
