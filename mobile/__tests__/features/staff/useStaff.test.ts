import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useStaffList, useCheckInStaff, useCheckOutStaff, useDeactivateStaff, useReactivateStaff, useDeleteStaff,
  useOnDutyStaff, useUpdateShift, useDeleteShift,
} from '../../../src/features/staff/hooks/useStaff';
import type { PaginatedResponse, Shift, Staff, StaffAttendance } from '../../../src/api/types';

const mockGetStaff = jest.fn<Promise<PaginatedResponse<Staff>>, [string, (Record<string, string | number> | undefined)?]>();
const mockCheckIn = jest.fn<Promise<StaffAttendance>, [string, string]>();
const mockCheckOut = jest.fn<Promise<StaffAttendance>, [string, string]>();
const mockDeactivateStaff = jest.fn<Promise<boolean>, [string, string]>();
const mockReactivateStaff = jest.fn<Promise<boolean>, [string, string]>();
const mockDeleteStaff = jest.fn<Promise<boolean>, [string, string]>();
const mockGetOnDuty = jest.fn<Promise<StaffAttendance[]>, [string]>();
const mockUpdateShift = jest.fn<Promise<Shift>, [string, string, unknown]>();
const mockDeleteShift = jest.fn<Promise<boolean>, [string, string]>();

jest.mock('../../../src/api/endpoints/staff', () => ({
  staffApi: {
    getStaff: (...args: [string, (Record<string, string | number> | undefined)?]) => mockGetStaff(...args),
    getStaffMember: jest.fn(),
    createStaff: jest.fn(),
    updateStaff: jest.fn(),
    deactivateStaff: (...args: [string, string]) => mockDeactivateStaff(...args),
    reactivateStaff: (...args: [string, string]) => mockReactivateStaff(...args),
    deleteStaff: (...args: [string, string]) => mockDeleteStaff(...args),
    checkIn: (...args: [string, string]) => mockCheckIn(...args),
    checkOut: (...args: [string, string]) => mockCheckOut(...args),
    getOnDuty: (...args: [string]) => mockGetOnDuty(...args),
    getShifts: jest.fn(),
    createShift: jest.fn(),
    updateShift: (...args: [string, string, unknown]) => mockUpdateShift(...args),
    deleteShift: (...args: [string, string]) => mockDeleteShift(...args),
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
    societyId: 'soc1',
    fullName: overrides.fullName ?? 'John Guard',
    phone: overrides.phone ?? '9876543210',
    category: overrides.category ?? 'Security',
    employmentType: overrides.employmentType ?? 'OnPayroll',
    isActive: overrides.isActive ?? true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Staff;
}

describe('useStaff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useStaffList returns the flat staff list', async () => {
    mockGetStaff.mockResolvedValue({
      items: [makeStaff({ id: '1', category: 'Security' }), makeStaff({ id: '2', category: 'Gardener' })],
      total: 2,
      page: 1,
      pageSize: 50,
    });

    const { result } = renderHook(() => useStaffList('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  test('useCheckInStaff resolves on success', async () => {
    mockCheckIn.mockResolvedValue({
      id: 'a1', societyId: 'soc1', staffId: 's1', staffName: 'John Guard',
      attendanceDate: '2026-01-01', isLate: false, status: 'CheckedIn',
    });

    const { result } = renderHook(() => useCheckInStaff('soc1'), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCheckIn).toHaveBeenCalledWith('soc1', 's1');
  });

  test('useCheckOutStaff resolves on success', async () => {
    mockCheckOut.mockResolvedValue({
      id: 'a1', societyId: 'soc1', staffId: 's1', staffName: 'John Guard',
      attendanceDate: '2026-01-01', isLate: false, status: 'CheckedOut',
    });

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

  test('useOnDutyStaff fetches on-duty status by default', async () => {
    mockGetOnDuty.mockResolvedValue([]);

    const { result } = renderHook(() => useOnDutyStaff('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetOnDuty).toHaveBeenCalledWith('soc1');
  });

  test('useOnDutyStaff never fetches when enabled is false (read-only SUUser viewer)', async () => {
    const { result } = renderHook(() => useOnDutyStaff('soc1', false), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);
    expect(mockGetOnDuty).not.toHaveBeenCalled();
  });

  test('useReactivateStaff resolves on success', async () => {
    mockReactivateStaff.mockResolvedValue(true);

    const { result } = renderHook(() => useReactivateStaff('soc1'), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockReactivateStaff).toHaveBeenCalledWith('soc1', 's1');
  });

  test('useDeleteStaff resolves on success', async () => {
    mockDeleteStaff.mockResolvedValue(true);

    const { result } = renderHook(() => useDeleteStaff('soc1'), { wrapper: createWrapper() });

    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteStaff).toHaveBeenCalledWith('soc1', 's1');
  });

  test('useUpdateShift resolves on success', async () => {
    const updated = { id: 'sh1', societyId: 'soc1', name: 'Morning', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 15 };
    mockUpdateShift.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateShift('soc1'), { wrapper: createWrapper() });

    result.current.mutate({ id: 'sh1', data: { name: 'Morning', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 15 } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateShift).toHaveBeenCalledWith('soc1', 'sh1', { name: 'Morning', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 15 });
  });

  test('useDeleteShift surfaces the backend error on failure', async () => {
    mockDeleteShift.mockRejectedValue({ response: { data: { errorCode: 'SHIFT_IN_USE' } } });

    const { result } = renderHook(() => useDeleteShift('soc1'), { wrapper: createWrapper() });

    result.current.mutate('sh1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockDeleteShift).toHaveBeenCalledWith('soc1', 'sh1');
  });
});
