import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { amenitiesApi, type BookAmenityRequest } from '../../../api/endpoints/amenities';

export function useAmenities(societyId: string) {
  return useQuery({
    queryKey: ['amenities', societyId],
    queryFn: () => amenitiesApi.getAmenities(societyId),
    enabled: !!societyId,
  });
}

export function useAmenityAvailability(societyId: string, amenityId: string, date: string) {
  return useQuery({
    queryKey: ['amenity-availability', societyId, amenityId, date],
    queryFn: () => amenitiesApi.getAvailability(societyId, amenityId, date),
    enabled: !!societyId && !!amenityId && !!date,
  });
}

export function useCreateBooking(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BookAmenityRequest) =>
      amenitiesApi.createBooking(societyId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['amenities', societyId] });
      void queryClient.invalidateQueries({ queryKey: ['amenity-bookings', societyId] });
    },
  });
}

export function useBookings(societyId: string) {
  return useQuery({
    queryKey: ['amenity-bookings', societyId],
    queryFn: () => amenitiesApi.getBookings(societyId, { page: 1, pageSize: 50 }),
    enabled: !!societyId,
  });
}

export function useCancelBooking(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      amenitiesApi.cancelBooking(societyId, id, remarks),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['amenity-bookings', societyId] });
    },
  });
}

export function useApproveBooking(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      amenitiesApi.approveBooking(societyId, id, adminNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['amenity-bookings', societyId] });
    },
  });
}

export function useRejectBooking(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      amenitiesApi.rejectBooking(societyId, id, adminNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['amenity-bookings', societyId] });
    },
  });
}
