import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResidentList, useDeleteResident } from '../../../src/features/residents/hooks/useResidents';
import type { PaginatedResponse, User } from '../../../src/api/types';

const mockGetResidents = jest.fn<Promise<PaginatedResponse<User>>, [string, (Record<string, string | number> | undefined)?]>();
const mockDeleteResident = jest.fn<Promise<void>, [string, string]>();

jest.mock('../../../src/api/endpoints/residents', () => ({
  residentsApi: {
    getResidents: (...args: [string, (Record<string, string | number> | undefined)?]) => mockGetResidents(...args),
    getResident: jest.fn(),
    deleteResident: (...args: [string, string]) => mockDeleteResident(...args),
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

function makeUser(overrides: Partial<User>): User {
  return {
    id: overrides.id ?? 'u1',
    societyId: 'soc1',
    fullName: overrides.fullName ?? 'Alice Smith',
    email: overrides.email ?? 'alice@example.com',
    phone: overrides.phone ?? '9876543210',
    role: overrides.role ?? 'SUUser',
    residentType: 'Owner',
    isVerified: true,
    isActive: true,
    ...overrides,
  } as User;
}

describe('useResidents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useResidentList groups nothing itself but returns the flat list for grouping downstream', async () => {
    mockGetResidents.mockResolvedValue({
      items: [makeUser({ id: '1', role: 'SUAdmin' }), makeUser({ id: '2', role: 'SUUser' })],
      total: 2,
      page: 1,
      pageSize: 20,
    });

    const { result } = renderHook(() => useResidentList('soc1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });

  test('useDeleteResident resolves on success', async () => {
    mockDeleteResident.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteResident('soc1'), { wrapper: createWrapper() });

    result.current.mutate('u1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteResident).toHaveBeenCalledWith('soc1', 'u1');
  });

  test('useDeleteResident surfaces the backend error on failure', async () => {
    mockDeleteResident.mockRejectedValue({ response: { data: { error: 'This user is still mapped to an apartment.' } } });

    const { result } = renderHook(() => useDeleteResident('soc1'), { wrapper: createWrapper() });

    result.current.mutate('u1');

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
