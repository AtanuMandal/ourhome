import api from '../client';
import type { PaginatedResponse } from '../types';

// Matches backend ServiceProviderResponse — field names shortened to match its compressed JSON keys.
export interface ServiceProvider {
  id: string;
  pn: string; // providerName
  cn: string; // contactName
  cp: string; // contactPhone
  svt: string[]; // serviceTypes
  ds: string; // description
  st: string; // status
  rt: number; // rating
  rc: number; // reviewCount
}

// Matches backend ServiceRequestResponse — field names shortened to match its compressed JSON keys.
export interface ServiceRequest {
  id: string;
  svt: string; // serviceType
  ds: string; // description
  pdt: string; // preferredDateTime
  st: string; // status
}

export interface RegisterServiceProviderRequest {
  providerName: string;
  contactName: string;
  phone: string;
  email: string;
  serviceTypes: string[];
  description: string;
}

export interface CreateServiceRequestRequest {
  apartmentId: string;
  userId: string;
  serviceType: string;
  description: string;
  preferredDateTime: string;
}

export const servicesApi = {
  listProviders: (societyId: string, params?: Record<string, string | number>) =>
    api
      .get<PaginatedResponse<ServiceProvider>>(`/societies/${societyId}/service-providers`, { params })
      .then((r) => r.data),

  // Platform-level registration (same endpoint the web app uses).
  registerProvider: (data: RegisterServiceProviderRequest) =>
    api.post<ServiceProvider>('/service-providers', data).then((r) => r.data),

  listRequests: (societyId: string, params?: Record<string, string | number>) =>
    api
      .get<PaginatedResponse<ServiceRequest>>(`/societies/${societyId}/service-requests`, { params })
      .then((r) => r.data),

  createRequest: (societyId: string, data: CreateServiceRequestRequest) =>
    api.post<ServiceRequest>(`/societies/${societyId}/service-requests`, data).then((r) => r.data),
};
