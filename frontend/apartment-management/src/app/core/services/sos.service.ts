import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { SosAlert, SosAlertListFilters, SosAlertReport, TriggerSosAlertDto } from '../models/sos.model';

@Injectable({ providedIn: 'root' })
export class SosService {
  private readonly api = inject(ApiService);

  trigger(societyId: string, dto: TriggerSosAlertDto) {
    return this.api.post<SosAlert>(`societies/${societyId}/sos-alerts`, dto);
  }

  list(societyId: string, page = 1, pageSize = 20, filters: SosAlertListFilters = {}) {
    return this.api.getPaged<SosAlert>(`societies/${societyId}/sos-alerts`, page, pageSize, {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
      ...(filters.toDate ? { toDate: filters.toDate } : {}),
    });
  }

  get(societyId: string, id: string) {
    return this.api.get<SosAlert>(`societies/${societyId}/sos-alerts/${id}`);
  }

  acknowledge(societyId: string, id: string) {
    return this.api.post<SosAlert>(`societies/${societyId}/sos-alerts/${id}/acknowledge`, {});
  }

  resolve(societyId: string, id: string) {
    return this.api.post<SosAlert>(`societies/${societyId}/sos-alerts/${id}/resolve`, {});
  }

  markFalseAlarm(societyId: string, id: string) {
    return this.api.post<SosAlert>(`societies/${societyId}/sos-alerts/${id}/false-alarm`, {});
  }

  report(societyId: string, fromDate: string, toDate: string) {
    return this.api.get<SosAlertReport>(`societies/${societyId}/sos-alerts/report`, { fromDate, toDate });
  }
}
