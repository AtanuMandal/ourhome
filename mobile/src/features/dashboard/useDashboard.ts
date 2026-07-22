import { useQuery } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { visitorsApi } from '../../api/endpoints/visitors';
import { noticesApi } from '../../api/endpoints/notices';
import { complaintsApi } from '../../api/endpoints/complaints';
import { financialReportApi, type UpcomingChargeDto } from '../../api/endpoints/financial-report';

export interface DashboardSummary {
  visitorsToday: number;
  unreadNotices: number;
  pendingComplaints: number;
  upcomingCharges: UpcomingChargeDto[];
  upcomingCashInflow: number;
  upcomingCashOutflow: number;
}

export function useDashboard() {
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl);
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin';

  return useQuery({
    queryKey: ['dashboard', societyId, isAdmin],
    queryFn: async (): Promise<DashboardSummary> => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      const [visitors, notices, complaints, financial] = await Promise.all([
        visitorsApi.getVisitors(societyId, { date: today, page: 1, pageSize: 1 }),
        noticesApi.getNotices(societyId, { page: 1, pageSize: 100 }),
        complaintsApi.getComplaints(societyId, { status: 'Pending', page: 1, pageSize: 1 }),
        // Only admins are authorized to call the financial-report dashboard endpoint —
        // skip the request entirely for non-admin roles rather than call it and get a 403.
        isAdmin ? financialReportApi.getDashboard(societyId) : Promise.resolve(null),
      ]);
      return {
        visitorsToday: visitors.total,
        unreadNotices: notices.items.filter((n) => !n.rd).length,
        pendingComplaints: complaints.total,
        upcomingCharges: financial?.upcomingCharges ?? [],
        upcomingCashInflow: financial?.upcomingCashInflow ?? 0,
        upcomingCashOutflow: financial?.upcomingCashOutflow ?? 0,
      };
    },
    enabled: !!societyId,
    staleTime: 60_000,
  });
}
