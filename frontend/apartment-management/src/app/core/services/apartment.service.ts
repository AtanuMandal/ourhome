import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Apartment, CreateApartmentDto, UpdateApartmentDto } from '../models/apartment.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ApartmentService {
  private readonly api = inject(ApiService);

  list(societyId: string, page = 1, pageSize = 20) {
    return this.api.getPaged<Apartment>(`societies/${societyId}/apartments`, page, pageSize);
  }

  get(societyId: string, id: string) {
    return this.api.get<Apartment>(`societies/${societyId}/apartments/${id}`);
  }

  create(societyId: string, dto: CreateApartmentDto) {
    return this.api.post<Apartment>(`societies/${societyId}/apartments`, dto);
  }

  update(societyId: string, id: string, dto: UpdateApartmentDto) {
    return this.api.put<Apartment>(`societies/${societyId}/apartments/${id}`, dto);
  }
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  get(societyId: string, id: string) {
    return this.api.get<User>(`societies/${societyId}/users/${id}`);
  }

  register(societyId: string, dto: { name: string; email: string; phone?: string; role: string; apartmentId?: string }) {
    return this.api.post<User>(`societies/${societyId}/users`, dto);
  }
}
