import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useHqSocieties,
  useHqSociety,
  useHqSocietyReport,
  useActivateSociety,
  useDeactivateSociety,
  useCreateSociety,
  useUpdateSociety,
  useHqUsers,
  useCreateHqUser,
  useActivateHqUser,
  useDeactivateHqUser,
} from '../../../src/features/hq/hooks/useHq';
import type { PaginatedResponse, User } from '../../../src/api/types';
import type { Society, SocietySummaryReport, CreateSocietyResponse } from '../../../src/api/endpoints/society';

const mockListSocieties = jest.fn<Promise<PaginatedResponse<Society>>, unknown[]>();
const mockGetSociety = jest.fn<Promise<Society>, unknown[]>();
const mockActivateSociety = jest.fn<Promise<boolean>, unknown[]>();
const mockDeactivateSociety = jest.fn<Promise<boolean>, unknown[]>();
const mockGetSummaryReport = jest.fn<Promise<SocietySummaryReport>, unknown[]>();
const mockCreateSociety = jest.fn<Promise<CreateSocietyResponse>, unknown[]>();
const mockUpdateSociety = jest.fn<Promise<Society>, unknown[]>();
const mockListHqUsers = jest.fn<Promise<PaginatedResponse<User>>, unknown[]>();
const mockCreateHqUser = jest.fn<Promise<User>, unknown[]>();
const mockActivateHqUser = jest.fn<Promise<boolean>, unknown[]>();
const mockDeactivateHqUser = jest.fn<Promise<boolean>, unknown[]>();

jest.mock('../../../src/api/endpoints/society', () => ({
  societyApi: {
    listSocieties: (...args: unknown[]) => mockListSocieties(...args),
    getSociety: (...args: unknown[]) => mockGetSociety(...args),
    activateSociety: (...args: unknown[]) => mockActivateSociety(...args),
    deactivateSociety: (...args: unknown[]) => mockDeactivateSociety(...args),
    getSummaryReport: (...args: unknown[]) => mockGetSummaryReport(...args),
    createSociety: (...args: unknown[]) => mockCreateSociety(...args),
    updateSociety: (...args: unknown[]) => mockUpdateSociety(...args),
  },
}));

jest.mock('../../../src/api/endpoints/hqUser', () => ({
  hqUserApi: {
    listHqUsers: (...args: unknown[]) => mockListHqUsers(...args),
    createHqUser: (...args: unknown[]) => mockCreateHqUser(...args),
    activateHqUser: (...args: unknown[]) => mockActivateHqUser(...args),
    deactivateHqUser: (...args: unknown[]) => mockDeactivateHqUser(...args),
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

function makeSociety(overrides: Partial<Society> = {}): Society {
  return {
    id: 's1', name: 'Green Valley',
    address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
    contactEmail: 'admin@gv.com', contactPhone: '9876543210',
    totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7, status: 'Active',
    societyUsers: [], committees: [],
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', societyId: 'hq', fullName: 'Platform Admin', email: 'admin@platform.com', phone: '9000000000',
    role: 'HQAdmin', residentType: 'SocietyAdmin', isVerified: true, isActive: true,
    ...overrides,
  } as User;
}

describe('useHq', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useHqSocieties returns the society list', async () => {
    mockListSocieties.mockResolvedValue({ items: [makeSociety()], total: 1, page: 1, pageSize: 100 });

    const { result } = renderHook(() => useHqSocieties(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.items).toHaveLength(1);
  });

  test('useActivateSociety calls the activate endpoint', async () => {
    mockActivateSociety.mockResolvedValue(true);

    const { result } = renderHook(() => useActivateSociety(), { wrapper: createWrapper() });
    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockActivateSociety).toHaveBeenCalledWith('s1');
  });

  test('useCreateSociety calls the create endpoint with the full payload', async () => {
    mockCreateSociety.mockResolvedValue({
      society: makeSociety(),
      admin: { id: 'a1', fullName: 'Raj Kumar', email: 'raj@gv.com', role: 'SUAdmin' },
    });

    const { result } = renderHook(() => useCreateSociety(), { wrapper: createWrapper() });
    result.current.mutate({
      name: 'Green Valley', street: '1 Main St', city: 'Bengaluru', state: 'Karnataka',
      postalCode: '560001', country: 'India', contactEmail: 'admin@gv.com', contactPhone: '9876543210',
      totalBlocks: 2, totalApartments: 40,
      adminFullName: 'Raj Kumar', adminEmail: 'raj@gv.com', adminPhone: '9000000001',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateSociety).toHaveBeenCalledWith(expect.objectContaining({ name: 'Green Valley', adminEmail: 'raj@gv.com' }));
  });

  test('useDeactivateSociety calls the deactivate endpoint', async () => {
    mockDeactivateSociety.mockResolvedValue(true);

    const { result } = renderHook(() => useDeactivateSociety(), { wrapper: createWrapper() });
    result.current.mutate('s1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeactivateSociety).toHaveBeenCalledWith('s1');
  });

  test('useHqSocietyReport returns occupancy data with no financial fields', async () => {
    const report: SocietySummaryReport = {
      societyId: 's1', societyName: 'Green Valley', status: 'Active',
      totalApartments: 40, occupiedApartments: 30, vacantApartments: 8, underMaintenanceApartments: 2,
      ownerCount: 25, tenantCount: 5, totalResidents: 30,
    };
    mockGetSummaryReport.mockResolvedValue(report);

    const { result } = renderHook(() => useHqSocietyReport('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.totalApartments).toBe(40);
    expect(Object.keys(result.current.data!)).not.toContain('totalIncome');
  });

  test('useHqUsers returns the HQ user list', async () => {
    mockListHqUsers.mockResolvedValue({ items: [makeUser()], total: 1, page: 1, pageSize: 100 });

    const { result } = renderHook(() => useHqUsers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.items).toHaveLength(1);
  });

  test('useCreateHqUser resolves on success', async () => {
    mockCreateHqUser.mockResolvedValue(makeUser({ id: 'u2', role: 'HQUser' }));

    const { result } = renderHook(() => useCreateHqUser(), { wrapper: createWrapper() });
    result.current.mutate({ fullName: 'New Viewer', email: 'viewer@platform.com', phone: '9000000001', role: 'HQUser' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateHqUser).toHaveBeenCalledWith({ fullName: 'New Viewer', email: 'viewer@platform.com', phone: '9000000001', role: 'HQUser' });
  });

  test('useHqSociety returns the requested society', async () => {
    mockGetSociety.mockResolvedValue(makeSociety());

    const { result } = renderHook(() => useHqSociety('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetSociety).toHaveBeenCalledWith('s1');
    expect(result.current.data!.id).toBe('s1');
  });

  test('useUpdateSociety calls the update endpoint with the full payload', async () => {
    mockUpdateSociety.mockResolvedValue(makeSociety({ name: 'Green Valley Updated' }));

    const { result } = renderHook(() => useUpdateSociety(), { wrapper: createWrapper() });
    result.current.mutate({
      societyId: 's1',
      data: {
        name: 'Green Valley Updated', contactEmail: 'admin@gv.com', contactPhone: '9876543210',
        totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7,
        street: '99 New Street', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateSociety).toHaveBeenCalledWith('s1', expect.objectContaining({ name: 'Green Valley Updated', city: 'Pune' }));
  });

  test('useActivateHqUser and useDeactivateHqUser call their endpoints', async () => {
    mockActivateHqUser.mockResolvedValue(true);
    mockDeactivateHqUser.mockResolvedValue(true);

    const { result: activateResult } = renderHook(() => useActivateHqUser(), { wrapper: createWrapper() });
    activateResult.current.mutate('u1');
    await waitFor(() => expect(activateResult.current.isSuccess).toBe(true));
    expect(mockActivateHqUser).toHaveBeenCalledWith('u1');

    const { result: deactivateResult } = renderHook(() => useDeactivateHqUser(), { wrapper: createWrapper() });
    deactivateResult.current.mutate('u1');
    await waitFor(() => expect(deactivateResult.current.isSuccess).toBe(true));
    expect(mockDeactivateHqUser).toHaveBeenCalledWith('u1');
  });
});
