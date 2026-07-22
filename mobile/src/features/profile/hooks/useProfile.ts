import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../../../api/endpoints/profile';
import { uploadProfilePicture } from '../../../camera/imageUpload';

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
    mutationFn: (data: { fullName?: string; phone?: string }) =>
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

export function useUploadProfilePicture(societyId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (localUri: string) => uploadProfilePicture(localUri, societyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', societyId, userId] });
      // User lists show the avatar too — refresh them on next focus.
      void queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

/** Accept or decline the pending apartment joining invitation on the signed-in user. */
export function useSettleApartmentInvitation(societyId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accept: boolean) =>
      accept
        ? profileApi.acceptApartmentInvitation(societyId, userId)
        : profileApi.declineApartmentInvitation(societyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', societyId, userId] });
    },
  });
}
