import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboard } from '../../../src/features/dashboard/useDashboard';
import { useAuthStore } from '../../../src/store/authStore';
import type { FinancialDashboardDto } from '../../../src/api/endpoints/financial-report';

const mockGetVisitors = jest.fn();
const mockGetNotices = jest.fn();
const mockGetComplaints = jest.fn();
const mockGetDashboard = jest.fn<Promise<FinancialDashboardDto>, [string]>();

jest.mock('../../../src/api/endpoints/visitors', () => ({
  visitorsApi: { getVisitors: (...args: unknown[]) => mockGetVisitors(...args) },
}));
jest.mock('../../../src/api/endpoints/notices', () => ({
  noticesApi: { getNotices: (...args: unknown[]) => mockGetNotices(...args) },
}));
jest.mock('../../../src/api/endpoints/complaints', () => ({
  complaintsApi: { getComplaints: (...args: unknown[]) => mockGetComplaints(...args) },
}));
jest.mock('../../../src/api/endpoints/financial-report', () => ({
  financialReportApi: { getDashboard: (...args: [string]) => mockGetDashboard(...args) },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const financialDashboard: FinancialDashboardDto = {
  month: 7, year: 2026, monthLabel: 'Jul 2026',
  maintenanceBilled: 10000, maintenanceCollected: 6000, maintenancePending: 4000,
  maintenanceOverdue: 0, collectionEfficiencyPercent: 60,
  vendorBilled: 2000, vendorPaid: 2000, vendorOutstanding: 0, netPosition: 4000,
  topOverdueApartments: [],
  upcomingVendorDues: [],
  upcomingCharges: [
    { apartmentId: 'apt-1', apartmentLabel: 'A-101', amount: 5000, dueDate: '2026-07-10', daysUntilDue: 2 },
  ],
  upcomingCashInflow: 5000,
  upcomingCashOutflow: 800,
};

describe('useDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVisitors.mockResolvedValue({ items: [], total: 3, page: 1, pageSize: 1 });
    mockGetNotices.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
    mockGetComplaints.mockResolvedValue({ items: [], total: 2, page: 1, pageSize: 1 });
    mockGetDashboard.mockResolvedValue(financialDashboard);
    useAuthStore.getState().clearAuth();
  });

  test('SUAdmin: fetches the financial dashboard and exposes upcoming-charges data', async () => {
    useAuthStore.setState({
      user: { id: 'u1', societyId: 'soc-1', fullName: 'Admin', email: 'a@a.com', role: 'SUAdmin' } as never,
      token: 'tok',
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetDashboard).toHaveBeenCalledWith('soc-1');
    expect(result.current.data?.upcomingCharges).toHaveLength(1);
    expect(result.current.data?.upcomingCashInflow).toBe(5000);
    expect(result.current.data?.upcomingCashOutflow).toBe(800);
  });

  test('SUUser: does not call the financial dashboard endpoint and defaults finance fields to zero', async () => {
    useAuthStore.setState({
      user: { id: 'u2', societyId: 'soc-1', fullName: 'Resident', email: 'r@r.com', role: 'SUUser' } as never,
      token: 'tok',
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetDashboard).not.toHaveBeenCalled();
    expect(result.current.data?.upcomingCharges).toEqual([]);
    expect(result.current.data?.upcomingCashInflow).toBe(0);
    expect(result.current.data?.upcomingCashOutflow).toBe(0);
    expect(result.current.data?.visitorsToday).toBe(3);
    expect(result.current.data?.pendingComplaints).toBe(2);
  });
});
