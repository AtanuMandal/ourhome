import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStaffList, useCheckInStaff, useCheckOutStaff, useDeactivateStaff } from '../../../src/features/staff/hooks/useStaff';
import type { PaginatedResponse, Staff, StaffAttendance } from '../../../src/api/types';

const mockGetStaff = jest.fn<Promise<PaginatedResponse<Staff>>, [string, (Record<string, string | number> | undefined)?]>();
const mockCheckIn = jest.fn<Promise<StaffAttendance>, [string, string]>();
const mockCheckOut = jest.fn<Promise<StaffAttendance>, [string, string]>();
const mockDeactivateStaff = jest.fn<Promise<boolean>, [string, string]>();

jest.mock('../../../src/api/endpoints/staff', () => ({
  staffApi: {
    getStaff: (...args: [string, (Record<string, string | number> | undefined)?]) => mockGetStaff(...args),
    getStaffMember: jest.fn(),
    createStaff: jest.fn(),
    updateStaff: jest.fn(),
    deactivateStaff: (...args: [string, string]) => mockDeactivateStaff(...args),
    checkIn: (...args: [string, string]) => mockCheckIn(...args),
    checkOut: (...args: [string, string]) => mockCheckOut(...args),
    getOnDuty: jest.fn(),
    getShifts: jest.fn(),
    createShift: jest.fn(),
    getAttendanceReport: jest.fn(),
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

function makeStaff(overrides: Partial<Staff>): Staff {
  return {
    id: overrides.id ?? 's1',
    fn: 'John Guard',
    ph: '9876543210',
    cat: 'Security',
    et: 'OnPayroll',
    ac: true,
    ...overrides,
  } as Staff;
}

describe('useStaff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useStaffList returns the flat staff list', async () => {
    mockGetStaff.mockResolvedValue({
      items: [makeStaff({ id: '1', cat: 'Security' }), makeStaff({ id: '2', cat: 'Gardener' })],
      total: 2,
      page: 1,
      pageSize: 50,
    });

    const { result } = renderHook(() => useStaffList('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  test('useCheckInStaff resolves on success', async () => {
    mockCheckIn.mockResolvedValue({ sid: 's1' });

    const { result } = renderHook(() => useCheckInStaff('soc1'), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCheckIn).toHaveBeenCalledWith('soc1', 's1');
  });

  test('useCheckOutStaff resolves on success', async () => {
    mockCheckOut.mockResolvedValue({ sid: 's1' });

    const { result } = renderHook(() => useCheckOutStaff('soc1'), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCheckOut).toHaveBeenCalledWith('soc1', 's1');
  });

  test('useDeactivateStaff surfaces the backend error on failure', async () => {
    mockDeactivateStaff.mockRejectedValue({ response: { data: { error: 'Staff member has open attendance.' } } });

    const { result } = renderHook(() => useDeactivateStaff('soc1'), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
