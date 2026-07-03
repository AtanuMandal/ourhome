import api from '../client';
import type { User } from '../types';

export const profileApi = {
  getProfile: (societyId: string, userId: string) =>
    api
      .get<User>(`/societies/${societyId}/users/${userId}/profile`)
      .then((r) => r.data),

  updateProfile: (societyId: string, userId: string, data: Partial<User>) =>
    api
      .put<User>(`/societies/${societyId}/users/${userId}/profile`, data)
      .then((r) => r.data),

  changePassword: (
    societyId: string,
    userId: string,
    data: { currentPassword: string; newPassword: string }
  ) =>
    api
      .post(`/societies/${societyId}/users/${userId}/change-password`, data)
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
