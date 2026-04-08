import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  ServiceProvider, ServiceRequest,
  CreateServiceRequestDto, RegisterServiceProviderDto
} from '../models/service-provider.model';

@Injectable({ providedIn: 'root' })
export class ServiceProviderService {
  private readonly api = inject(ApiService);

  register(dto: RegisterServiceProviderDto) {
    return this.api.post<ServiceProvider>('service-providers', dto);
  }

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<ServiceProvider>(`societies/${societyId}/service-providers`, page, pageSize);
  }

  createRequest(societyId: string, dto: CreateServiceRequestDto) {
    return this.api.post<ServiceRequest>(`societies/${societyId}/service-requests`, dto);
  }

  listRequests(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<ServiceRequest>(`societies/${societyId}/service-requests`, page, pageSize);
  }
}
