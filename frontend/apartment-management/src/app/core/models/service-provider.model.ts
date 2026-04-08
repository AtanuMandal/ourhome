export type ServiceCategory = 'Plumber' | 'Electrician' | 'Carpenter' | 'Painter' | 'Cleaner' | 'AC_Repair' | 'Other';
export type ServiceRequestStatus = 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

// Matches backend ServiceProviderResponse DTO
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

// Matches backend ServiceRequestResponse DTO
export interface ServiceRequest {
  id: string;
  societyId: string;
  apartmentId: string;
  serviceType: string;
  description: string;
  preferredDateTime: string;
  status: ServiceRequestStatus;
  acceptedByProviderId?: string;
  rating?: number;
  reviewComment?: string;
  createdAt: string;
}

export interface RegisterServiceProviderDto {
  providerName: string;
  contactName: string;
  phone: string;
  email: string;
  serviceTypes: string[];
  description: string;
}

export interface CreateServiceRequestDto {
  apartmentId: string;
  userId: string;
  serviceType: string;
  description: string;
  preferredDateTime: string;
}
