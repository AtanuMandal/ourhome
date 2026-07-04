import api from '../client';
import type { User } from '../types';

export const profileApi = {
  // Backend: GET /societies/{societyId}/users/{id}  (no /profile suffix)
  getProfile: (societyId: string, userId: string) =>
    api
      .get<User>(`/societies/${societyId}/users/${userId}`)
      .then((r) => r.data),

  // Backend: PUT /societies/{societyId}/users/{id}  (no /profile suffix)
  updateProfile: (societyId: string, userId: string, data: { fullName?: string; phone?: string }) =>
    api
      .put<User>(`/societies/${societyId}/users/${userId}`, data)
      .then((r) => r.data),

  // Backend: PUT /societies/{societyId}/users/{id}/password  (not POST /change-password)
  changePassword: (
    societyId: string,
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ) =>
    api
      .put(`/societies/${societyId}/users/${userId}/password`, data)
      .then((r) => r.data),

  registerMobilePushToken: (
    societyId: string,
    userId: string,
    platform: 'ios' | 'android',
    token: string,
    appVersion?: string
  ) =>
    api
      .post(`/societies/${societyId}/users/${userId}/mobile-push-tokens`, {
        platform,
        token,
        appVersion,
      })
      .then((r) => r.data),
};
