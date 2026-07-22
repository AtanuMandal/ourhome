export type ServiceCategory = 'Plumber' | 'Electrician' | 'Carpenter' | 'Painter' | 'Cleaner' | 'AC_Repair' | 'Other';
export type ServiceRequestStatus = 'Pending' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled';

// Matches backend ServiceProviderResponse DTO — field names shortened to match its compressed JSON keys.
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

// Matches backend ServiceRequestResponse DTO — field names shortened to match its compressed JSON keys.
export interface ServiceRequest {
  id: string;
  svt: string; // serviceType
  ds: string; // description
  pdt: string; // preferredDateTime
  st: ServiceRequestStatus; // status
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
