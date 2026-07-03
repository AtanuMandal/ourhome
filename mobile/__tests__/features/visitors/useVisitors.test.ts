import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVisitorList } from '../../../src/features/visitors/hooks/useVisitors';
import type { PaginatedResponse } from '../../../src/api/types';
import type { Visitor } from '../../../src/api/types';

const mockGetVisitors = jest.fn<Promise<PaginatedResponse<Visitor>>, [string, (Record<string, string | number> | undefined)?]>();

jest.mock('../../../src/api/endpoints/visitors', () => ({
  visitorsApi: {
    getVisitors: (...args: [string, (Record<string, string | number> | undefined)?]) =>
      mockGetVisitors(...args),
    getVisitor: jest.fn(),
    registerVisitor: jest.fn(),
    approveVisitor: jest.fn(),
    denyVisitor: jest.fn(),
    checkOutVisitor: jest.fn(),
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
});
