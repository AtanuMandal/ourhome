import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { staffApi, CreateStaffRequest, UpdateStaffRequest, CreateShiftRequest, UpdateShiftRequest } from '../../../api/endpoints/staff';
import type { Staff } from '../../../api/types';

export function useStaffList(societyId: string, params?: Record<string, string | number>) {
  return useInfiniteList<Staff>({
    queryKey: ['staff', societyId, params],
    fetchPage: (page) => staffApi.getStaff(societyId, { ...params, page, pageSize: 50 }),
    enabled: !!societyId,
  });
}

export function useStaffMember(societyId: string, id: string) {
  return useQuery({
    queryKey: ['staff-member', societyId, id],
    queryFn: () => staffApi.getStaffMember(societyId, id),
    enabled: !!societyId && !!id,
  });
}

// enabled defaults to true; StaffListScreen passes false for a read-only SUUser viewer since
// GetOnDutyStaff is SUAdmin/SUSecurity-only server-side.
export function useOnDutyStaff(societyId: string, enabled = true) {
  return useQuery({
    queryKey: ['staff-on-duty', societyId],
    queryFn: () => staffApi.getOnDuty(societyId),
    enabled: !!societyId && enabled,
  });
}

export function useShifts(societyId: string) {
  return useQuery({
    queryKey: ['shifts', societyId],
    queryFn: () => staffApi.getShifts(societyId),
    enabled: !!societyId,
  });
}

function invalidateStaffQueries(queryClient: ReturnType<typeof useQueryClient>, societyId: string) {
  void queryClient.invalidateQueries({ queryKey: ['staff', societyId] });
  void queryClient.invalidateQueries({ queryKey: ['staff-on-duty', societyId] });
}

export function useCreateStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStaffRequest) => staffApi.createStaff(societyId, data),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useUpdateStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffRequest }) => staffApi.updateStaff(societyId, id, data),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useDeactivateStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.deactivateStaff(societyId, id),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useReactivateStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.reactivateStaff(societyId, id),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useDeleteStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.deleteStaff(societyId, id),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useCheckInStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.checkIn(societyId, id),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useCheckOutStaff(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.checkOut(societyId, id),
    onSuccess: () => invalidateStaffQueries(queryClient, societyId),
  });
}

export function useCreateShift(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftRequest) => staffApi.createShift(societyId, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['shifts', societyId] }),
  });
}

export function useUpdateShift(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftRequest }) => staffApi.updateShift(societyId, id, data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['shifts', societyId] }),
  });
}

export function useDeleteShift(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.deleteShift(societyId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['shifts', societyId] }),
  });
}

export function useStaffAttendanceReport(societyId: string, fromDate: string, toDate: string, category?: string) {
  return useQuery({
    queryKey: ['staff-attendance-report', societyId, fromDate, toDate, category],
    queryFn: () => staffApi.getAttendanceReport(societyId, fromDate, toDate, category),
    enabled: !!societyId,
  });
}
