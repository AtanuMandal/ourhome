import api from '../client';
import type { User, PaginatedResponse } from '../types';

export const residentsApi = {
  getResidents: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<User>>(`/societies/${societyId}/residents`, { params })
      .then((r) => r.data),

  getResident: (societyId: string, id: string) =>
    api
      .get<User>(`/societies/${societyId}/residents/${id}`)
      .then((r) => r.data),
};
