import { useQuery } from '@tanstack/react-query';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { visitorsApi } from '../../api/endpoints/visitors';
import { noticesApi } from '../../api/endpoints/notices';
import { complaintsApi } from '../../api/endpoints/complaints';

export interface DashboardSummary {
  visitorsToday: number;
  unreadNotices: number;
  pendingComplaints: number;
}

export function useDashboard() {
  const societyId = useSocietyId();

  return useQuery({
    queryKey: ['dashboard', societyId],
    queryFn: async (): Promise<DashboardSummary> => {
      const today = new Date().toISOString().split('T')[0] ?? '';
      const [visitors, notices, complaints] = await Promise.all([
        visitorsApi.getVisitors(societyId, { date: today, page: 1, pageSize: 1 }),
        noticesApi.getNotices(societyId, { page: 1, pageSize: 100 }),
        complaintsApi.getComplaints(societyId, { status: 'Pending', page: 1, pageSize: 1 }),
      ]);
      return {
        visitorsToday: visitors.total,
        unreadNotices: notices.items.filter((n) => !n.isReadByCurrentUser).length,
        pendingComplaints: complaints.total,
      };
    },
    enabled: !!societyId,
    staleTime: 60_000,
  });
}
