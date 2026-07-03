import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../../../api/endpoints/profile';
import type { User } from '../../../api/types';

export function useProfile(societyId: string, userId: string) {
  return useQuery({
    queryKey: ['profile', societyId, userId],
    queryFn: () => profileApi.getProfile(societyId, userId),
    enabled: !!societyId && !!userId,
  });
}

export function useUpdateProfile(societyId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<User>) =>
      profileApi.updateProfile(societyId, userId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', societyId, userId] });
    },
  });
}

export function useChangePassword(societyId: string, userId: string) {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword(societyId, userId, data),
  });
}
