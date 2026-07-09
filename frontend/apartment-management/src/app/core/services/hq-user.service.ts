import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { User, CreateHqUserDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class HqUserService {
  private readonly api = inject(ApiService);

  list(page = 1, pageSize = 20) {
    return this.api.getPaged<User>('hq/users', page, pageSize);
  }

  get(id: string) {
    return this.api.get<User>(`hq/users/${id}`);
  }

  create(dto: CreateHqUserDto) {
    return this.api.post<User>('hq/users', dto);
  }

  activate(id: string) {
    return this.api.post<boolean>(`hq/users/${id}/activate`, {});
  }

  deactivate(id: string) {
    return this.api.post<boolean>(`hq/users/${id}/deactivate`, {});
  }
}
