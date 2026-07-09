import api from '../client';
import type {
  PaginatedResponse,
  SosAlert,
  SosAlertReport,
  SosAlertStatus,
  SosCategory,
} from '../types';

export interface TriggerSosAlertRequest {
  category: SosCategory;
  note?: string;
}

export const sosApi = {
  trigger: (societyId: string, data: TriggerSosAlertRequest) =>
    api.post<SosAlert>(`/societies/${societyId}/sos-alerts`, data).then((r) => r.data),

  getAlerts: (
    societyId: string,
    params?: { status?: SosAlertStatus; category?: SosCategory; fromDate?: string; toDate?: string; page?: number; pageSize?: number }
  ) =>
    api.get<PaginatedResponse<SosAlert>>(`/societies/${societyId}/sos-alerts`, { params }).then((r) => r.data),

  getAlert: (societyId: string, id: string) =>
    api.get<SosAlert>(`/societies/${societyId}/sos-alerts/${id}`).then((r) => r.data),

  acknowledge: (societyId: string, id: string) =>
    api.post<SosAlert>(`/societies/${societyId}/sos-alerts/${id}/acknowledge`).then((r) => r.data),

  resolve: (societyId: string, id: string) =>
    api.post<SosAlert>(`/societies/${societyId}/sos-alerts/${id}/resolve`).then((r) => r.data),

  markFalseAlarm: (societyId: string, id: string) =>
    api.post<SosAlert>(`/societies/${societyId}/sos-alerts/${id}/false-alarm`).then((r) => r.data),

  getReport: (societyId: string, fromDate: string, toDate: string) =>
    api
      .get<SosAlertReport>(`/societies/${societyId}/sos-alerts/report`, { params: { fromDate, toDate } })
      .then((r) => r.data),
};
