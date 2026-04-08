export type ServiceCategory = 'Plumber' | 'Electrician' | 'Carpenter' | 'Painter' | 'Cleaner' | 'AC_Repair' | 'Other';
export type ServiceRequestStatus = 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

export interface ServiceProvider {
  id: string;
  name: string;
  category: ServiceCategory;
  phone: string;
  email?: string;
  description?: string;
  rating?: number;
  totalJobs?: number;
  isVerified: boolean;
  availableSocieties?: string[];
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  societyId: string;
  apartmentId: string;
  apartmentUnit?: string;
  requestedBy: string;
  requestedByName?: string;
  serviceProviderId?: string;
  providerName?: string;
  category: ServiceCategory;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  scheduledAt?: string;
  completedAt?: string;
  rating?: number;
  review?: string;
  createdAt: string;
}

export interface CreateServiceRequestDto {
  apartmentId: string;
  requestedBy: string;
  category: ServiceCategory;
  title: string;
  description: string;
  serviceProviderId?: string;
  scheduledAt?: string;
}

export interface RegisterServiceProviderDto {
  name: string;
  category: ServiceCategory;
  phone: string;
  email?: string;
  description?: string;
}
