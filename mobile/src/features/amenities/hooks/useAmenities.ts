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
    },
  });
}
