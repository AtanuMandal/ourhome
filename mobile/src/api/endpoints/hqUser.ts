import api from '../client';
import type { PaginatedResponse, User } from '../types';

export interface CreateHqUserRequest {
  fullName: string;
  email: string;
  phone: string;
  role: 'HQAdmin' | 'HQUser';
}

export const hqUserApi = {
  listHqUsers: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<User>>('/hq/users', { params }).then((r) => r.data),

  getHqUser: (id: string) =>
    api.get<User>(`/hq/users/${id}`).then((r) => r.data),

  createHqUser: (data: CreateHqUserRequest) =>
    api.post<User>('/hq/users', data).then((r) => r.data),

  activateHqUser: (id: string) =>
    api.post<boolean>(`/hq/users/${id}/activate`).then((r) => r.data),

  deactivateHqUser: (id: string) =>
    api.post<boolean>(`/hq/users/${id}/deactivate`).then((r) => r.data),
};
