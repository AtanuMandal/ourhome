import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '../../../shared/hooks/useInfiniteList';
import { amenitiesApi } from '../../../api/endpoints/amenities';
import type { AmenityBooking } from '../../../api/types';

export function useAmenities(societyId: string) {
  return useQuery({
    queryKey: ['amenities', societyId],
    queryFn: () => amenitiesApi.getAmenities(societyId),
    enabled: !!societyId,
  });
}

export function useBookingList(
  societyId: string,
  params?: Record<string, string | number>
) {
  return useInfiniteList<AmenityBooking>({
    queryKey: ['amenity-bookings', societyId, params],
    fetchPage: (page) =>
      amenitiesApi.getBookings(societyId, { ...params, page, pageSize: 20 }),
    enabled: !!societyId,
  });
}

export function useCreateBooking(societyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AmenityBooking>) =>
      amenitiesApi.createBooking(societyId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['amenity-bookings', societyId] });
    },
  });
}
