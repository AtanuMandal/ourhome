import api from '../client';
import type { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    api
      .post<{ token: string }>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  requestPasswordReset: (email: string) =>
    api.post('/auth/password-reset/request', { email }),
};
