import api from '../client';
import type { PaginatedResponse } from '../types';

// Matches backend ServiceProviderResponse
export interface ServiceProvider {
  id: string;
  providerName: string;
  contactName: string;
  contactPhone: string;
  serviceTypes: string[];
  description: string;
  status: string;
  rating: number;
  reviewCount: number;
}

// Matches backend ServiceRequestResponse
export interface ServiceRequest {
  id: string;
  societyId: string;
  apartmentId: string;
  serviceType: string;
  description: string;
  preferredDateTime: string;
  status: string;
  acceptedByProviderId?: string;
  rating?: number;
  reviewComment?: string;
  createdAt: string;
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
