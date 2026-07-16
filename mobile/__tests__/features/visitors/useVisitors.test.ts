import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVisitorList, useVisitorDefaultView, useVisitorLookups, useCheckInVisitorByPass } from '../../../src/features/visitors/hooks/useVisitors';
import type { PaginatedResponse } from '../../../src/api/types';
import type { Visitor } from '../../../src/api/types';

const mockGetVisitors = jest.fn<Promise<PaginatedResponse<Visitor>>, [string, (Record<string, string | number> | undefined)?]>();
const mockGetDefaultView = jest.fn<Promise<Visitor[]>, [string, number]>();
const mockGetLookups = jest.fn();
const mockCheckInByPass = jest.fn<Promise<Visitor>, [string, string]>();

jest.mock('../../../src/api/endpoints/visitors', () => ({
  visitorsApi: {
    getVisitors: (...args: [string, (Record<string, string | number> | undefined)?]) =>
      mockGetVisitors(...args),
    getDefaultView: (...args: [string, number]) => mockGetDefaultView(...args),
    getVisitor: jest.fn(),
    registerVisitor: jest.fn(),
    approveVisitor: jest.fn(),
    denyVisitor: jest.fn(),
    checkOutVisitor: jest.fn(),
    checkInVisitorByPass: (...args: [string, string]) => mockCheckInByPass(...args),
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

  test('useVisitorDefaultView fetches the whole landing view in one backend call', async () => {
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

    // The backend now merges pending + checked-in + recent server-side.
    mockGetDefaultView.mockResolvedValue([
      makeVisitor('p1', 'Pending'),
      makeVisitor('ci1', 'CheckedIn'),
      makeVisitor('c1', 'CheckedOut'),
    ]);

    const { result } = renderHook(() => useVisitorDefaultView('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetDefaultView).toHaveBeenCalledTimes(1);
    expect(mockGetDefaultView).toHaveBeenCalledWith('soc1', 10);
    expect(mockGetVisitors).not.toHaveBeenCalled();
    expect(result.current.data?.map(v => v.id)).toEqual(['p1', 'ci1', 'c1']);
  });

  test('useCheckInVisitorByPass verifies the pass and returns the checked-in visitor', async () => {
    const checkedIn: Visitor = {
      id: 'v1',
      societyId: 'soc1',
      residentId: 'res1',
      residentName: 'John Doe',
      visitorName: 'Jane Smith',
      visitorPhone: '9876543210',
      purpose: 'Guest visit',
      status: 'CheckedIn',
      createdAt: '2024-01-15T10:00:00Z',
    };
    mockCheckInByPass.mockResolvedValue(checkedIn);

    const { result } = renderHook(() => useCheckInVisitorByPass('soc1'), { wrapper: createWrapper() });

    const visitor = await result.current.mutateAsync('ABC123');

    expect(mockCheckInByPass).toHaveBeenCalledWith('soc1', 'ABC123');
    expect(visitor.status).toBe('CheckedIn');
  });

  test('useVisitorLookups returns companies and purposes for the society', async () => {
    mockGetLookups.mockResolvedValue({ companies: ['Amazon'], purposes: ['Delivery'] });

    const { result } = renderHook(() => useVisitorLookups('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetLookups).toHaveBeenCalledWith('soc1');
    expect(result.current.data).toEqual({ companies: ['Amazon'], purposes: ['Delivery'] });
  });
});
