import api from '../client';
import type { Apartment, PaginatedResponse } from '../types';

export const apartmentsApi = {
  getApartments: (
    societyId: string,
    params?: Record<string, string | number>
  ) =>
    api
      .get<PaginatedResponse<Apartment>>(`/societies/${societyId}/apartments`, { params })
      .then((r) => r.data),

  getApartment: (societyId: string, id: string) =>
    api
      .get<Apartment>(`/societies/${societyId}/apartments/${id}`)
      .then((r) => r.data),
};
