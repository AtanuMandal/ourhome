import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinancialDashboard, useSocietyLedger } from '../../../src/features/financial-report/hooks/useFinancialReport';
import type { FinancialDashboardDto, SocietyLedgerDto } from '../../../src/api/endpoints/financial-report';

const mockGetDashboard = jest.fn<Promise<FinancialDashboardDto>, [string]>();
const mockGetSocietyLedger = jest.fn<Promise<SocietyLedgerDto>, [string, string?, string?]>();

jest.mock('../../../src/api/endpoints/financial-report', () => ({
  financialReportApi: {
    getSocietySummary: jest.fn(),
    getDashboard: (...args: [string]) => mockGetDashboard(...args),
    getPersonalStatement: jest.fn(),
    getSocietyLedger: (...args: [string, string?, string?]) => mockGetSocietyLedger(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useFinancialReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('useFinancialDashboard returns the upcoming-charges/cash-flow shape', async () => {
    const mockData: FinancialDashboardDto = {
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
      upcomingCashOutflow: 0,
    };
    mockGetDashboard.mockResolvedValue(mockData);

    const { result } = renderHook(() => useFinancialDashboard('soc-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.upcomingCharges).toHaveLength(1);
    expect(result.current.data?.upcomingCashInflow).toBe(5000);
    expect(result.current.data?.upcomingCashOutflow).toBe(0);
  });

  test('useSocietyLedger fetches ledger data when enabled', async () => {
    const mockData: SocietyLedgerDto = {
      societyId: 'soc-1',
      currentBalance: 3000,
      entries: [
        { date: '2026-07-01', description: 'Maintenance — A-101 — Jul 2026', type: 'Charge', debit: 5000, credit: null, balance: 5000 },
        { date: '2026-07-02', description: 'Payment received — A-101 — Jul 2026', type: 'Payment', debit: null, credit: 5000, balance: 0 },
      ],
    };
    mockGetSocietyLedger.mockResolvedValue(mockData);

    const { result } = renderHook(() => useSocietyLedger('soc-1', true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetSocietyLedger).toHaveBeenCalledWith('soc-1');
    expect(result.current.data?.entries).toHaveLength(2);
    expect(result.current.data?.currentBalance).toBe(3000);
  });

  test('useSocietyLedger does not fetch when disabled', async () => {
    const { result } = renderHook(() => useSocietyLedger('soc-1', false), { wrapper: createWrapper() });

    expect(mockGetSocietyLedger).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
